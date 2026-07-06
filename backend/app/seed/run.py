"""NovaPay seed entrypoint: truncate-and-reseed the full scenario.

Usage: poetry run python -m app.seed.run
"""

from __future__ import annotations

import asyncio
import os

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import Settings
from app.models import (
    Area,
    DepartmentScore,
    Indicator,
    IndicatorDepartment,
    IndicatorResult,
    StrategicPillar,
)
from app.seed.data import AREAS, INDICATORS, PILLARS, RELATED_KPIS_EDGES
from app.seed.generate_results import generate_results_for_indicator
from app.seed.generate_scores import generate_department_scores


def _database_url() -> str:
    return os.environ.get("DATABASE_URL") or Settings().DATABASE_URL


async def _truncate_all(session: AsyncSession) -> None:
    for model in (
        DepartmentScore,
        IndicatorResult,
        IndicatorDepartment,
        Indicator,
        Area,
        StrategicPillar,
    ):
        await session.execute(delete(model))


async def _seed(session: AsyncSession) -> None:
    await _truncate_all(session)

    pillars_by_key = {}
    for pillar in PILLARS:
        row = StrategicPillar(name=pillar["name"], description=pillar["description"])
        session.add(row)
        pillars_by_key[pillar["key"]] = row
    await session.flush()

    areas_by_key = {}
    for area in AREAS:
        row = Area(name=area["name"], pillar_id=pillars_by_key[area["pillar_key"]].id)
        session.add(row)
        areas_by_key[area["key"]] = row
    await session.flush()

    indicators_by_code = {}
    for indicator in INDICATORS:
        row = Indicator(
            code=indicator["code"],
            name=indicator["name"],
            unit=indicator["unit"],
            polarity=indicator["polarity"],
            calculation_method=indicator["calculation_method"],
            composition=indicator["composition"],
            accumulation_type=indicator["accumulation_type"],
            kpi_type=indicator["kpi_type"],
            area_id=areas_by_key[indicator["area_key"]].id,
        )
        session.add(row)
        indicators_by_code[indicator["code"]] = row
    await session.flush()

    related_kpis_by_code: dict[str, list[dict]] = {}
    for source_code, target_code, relationship in RELATED_KPIS_EDGES:
        related_kpis_by_code.setdefault(source_code, []).append(
            {"code": target_code, "relationship": relationship}
        )
    for code, edges in related_kpis_by_code.items():
        indicators_by_code[code].related_kpis = edges
    await session.flush()

    for indicator in INDICATORS:
        session.add(
            IndicatorDepartment(
                indicator_id=indicators_by_code[indicator["code"]].id,
                area_id=areas_by_key[indicator["area_key"]].id,
                weight=indicator["weight"],
                is_primary_owner=True,
            )
        )
    await session.flush()

    kpi_scores_and_weights_by_area_period: dict[tuple[str, object], list[tuple[float, float]]] = {}
    for indicator in INDICATORS:
        generated = generate_results_for_indicator(
            indicator["code"], indicator["target"], indicator["polarity"], indicator["kpi_type"]
        )
        for entry in generated:
            session.add(
                IndicatorResult(
                    indicator_id=indicators_by_code[indicator["code"]].id,
                    period=entry["period"],
                    result=entry["result"],
                    target=entry["target"],
                    kpi_score=entry["kpi_score"],
                    status=entry["status"],
                )
            )
            key = (indicator["area_key"], entry["period"])
            kpi_scores_and_weights_by_area_period.setdefault(key, []).append(
                (entry["kpi_score"], indicator["weight"])
            )
    await session.flush()

    for area_key, area_row in areas_by_key.items():
        by_period = {
            period: scores_and_weights
            for (a_key, period), scores_and_weights in kpi_scores_and_weights_by_area_period.items()
            if a_key == area_key
        }
        for department_score in generate_department_scores(by_period):
            session.add(
                DepartmentScore(
                    area_id=area_row.id,
                    period=department_score["period"],
                    score=department_score["score"],
                    grade=department_score["grade"],
                )
            )
    await session.flush()

    await session.commit()


async def run() -> None:
    engine = create_async_engine(_database_url())
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        await _seed(session)
    await engine.dispose()


def main() -> None:
    asyncio.run(run())


if __name__ == "__main__":
    main()
