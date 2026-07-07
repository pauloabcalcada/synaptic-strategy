"""Executive overview aggregation — reads pre-computed department_scores,
never recomputes KPI scores at request time."""

from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Area, DepartmentScore, StrategicPillar
from app.services.scoring import score_to_grade


async def _current_period(session: AsyncSession) -> object:
    return await session.scalar(select(func.max(DepartmentScore.period)))


async def build_areas(session: AsyncSession) -> list[dict]:
    rows = (
        await session.execute(
            select(Area, StrategicPillar.name)
            .join(StrategicPillar, StrategicPillar.id == Area.pillar_id)
        )
    ).all()

    current_period = await _current_period(session)

    areas = []
    for area, pillar_name in rows:
        current_score = await session.scalar(
            select(DepartmentScore)
            .where(DepartmentScore.area_id == area.id)
            .where(DepartmentScore.period == current_period)
        )
        prior_score = await session.scalar(
            select(DepartmentScore)
            .where(DepartmentScore.area_id == area.id)
            .where(DepartmentScore.period < current_period)
            .order_by(DepartmentScore.period.desc())
            .limit(1)
        )
        score_mom_delta = (
            float(current_score.score) - float(prior_score.score)
            if prior_score is not None
            else None
        )

        areas.append(
            {
                "area_id": str(area.id),
                "name": area.name,
                "pillar": pillar_name,
                "score": float(current_score.score),
                "grade": current_score.grade,
                "score_mom_delta": score_mom_delta,
            }
        )

    return areas


async def build_overview(session: AsyncSession) -> dict:
    areas = await build_areas(session)
    return {"areas": areas}
