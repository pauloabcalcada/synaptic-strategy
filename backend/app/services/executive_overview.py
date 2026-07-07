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


async def build_pillars(session: AsyncSession, areas: list[dict]) -> list[dict]:
    pillars_by_name: dict[str, list[dict]] = {}
    for area in areas:
        pillars_by_name.setdefault(area["pillar"], []).append(area)

    pillars = []
    for pillar_name, member_areas in pillars_by_name.items():
        rollup_score = sum(a["score"] for a in member_areas) / len(member_areas)
        pillars.append(
            {
                "name": pillar_name,
                "areas": [a["name"] for a in member_areas],
                "rollup_grade": score_to_grade(rollup_score),
                "rollup_score": rollup_score,
            }
        )

    return pillars


HEATMAP_PERIODS = 12


async def build_heatmap(session: AsyncSession, areas: list[dict]) -> list[dict]:
    heatmap = []
    for area in areas:
        history = (
            await session.scalars(
                select(DepartmentScore)
                .where(DepartmentScore.area_id == area["area_id"])
                .order_by(DepartmentScore.period.desc())
                .limit(HEATMAP_PERIODS)
            )
        ).all()
        cells = [
            {
                "period": row.period.isoformat(),
                "grade": row.grade,
                "score": float(row.score),
            }
            for row in reversed(history)
        ]
        heatmap.append(
            {
                "area_id": area["area_id"],
                "name": area["name"],
                "cells": cells,
            }
        )

    return heatmap


async def build_overview(session: AsyncSession) -> dict:
    areas = await build_areas(session)
    pillars = await build_pillars(session, areas)
    heatmap = await build_heatmap(session, areas)
    return {"areas": areas, "pillars": pillars, "heatmap": heatmap}
