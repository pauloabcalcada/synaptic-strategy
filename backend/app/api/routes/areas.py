import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import (
    Area,
    DepartmentScore,
    Indicator,
    IndicatorDepartment,
    IndicatorResult,
    StrategicPillar,
)

router = APIRouter()

SPARKLINE_LENGTH = 12


async def _resolve_period(session: AsyncSession, period: date | None) -> date:
    if period is not None:
        return period
    return await session.scalar(select(func.max(IndicatorResult.period)))


async def _kpi_row(session: AsyncSession, indicator: Indicator, period: date) -> dict:
    current = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period == period)
    )
    prior = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period < period)
        .order_by(IndicatorResult.period.desc())
        .limit(1)
    )
    mom_trend = (
        float(current.kpi_score) - float(prior.kpi_score) if prior is not None else None
    )

    history = (
        await session.scalars(
            select(IndicatorResult)
            .where(IndicatorResult.indicator_id == indicator.id)
            .where(IndicatorResult.period <= period)
            .order_by(IndicatorResult.period.desc())
            .limit(SPARKLINE_LENGTH)
        )
    ).all()
    sparkline = [float(result.kpi_score) for result in reversed(history)]

    return {
        "code": indicator.code,
        "name": indicator.name,
        "unit": indicator.unit,
        "result": float(current.result),
        "target": float(current.target),
        "kpi_score": float(current.kpi_score),
        "status": current.status,
        "mom_trend": mom_trend,
        "sparkline": sparkline,
    }


async def _area_summary(session: AsyncSession, area: Area) -> dict:
    current_period = await session.scalar(select(func.max(IndicatorResult.period)))

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
    score_trend = (
        float(current_score.score) - float(prior_score.score)
        if prior_score is not None
        else None
    )

    kpi_count = await session.scalar(
        select(func.count())
        .select_from(IndicatorDepartment)
        .where(IndicatorDepartment.area_id == area.id)
    )

    status_rows = (
        await session.execute(
            select(IndicatorResult.status, func.count())
            .join(IndicatorDepartment, IndicatorDepartment.indicator_id == IndicatorResult.indicator_id)
            .where(IndicatorDepartment.area_id == area.id)
            .where(IndicatorResult.period == current_period)
            .group_by(IndicatorResult.status)
        )
    ).all()
    status_breakdown = {status: count for status, count in status_rows}

    return {
        "score": float(current_score.score),
        "grade": current_score.grade,
        "score_trend": score_trend,
        "kpi_count": kpi_count,
        "status_breakdown": status_breakdown,
    }


@router.get("/areas")
async def list_areas(session: AsyncSession = Depends(get_session)):
    rows = (
        await session.execute(
            select(Area, StrategicPillar.name)
            .join(StrategicPillar, StrategicPillar.id == Area.pillar_id)
        )
    ).all()

    return [
        {
            "id": str(area.id),
            "name": area.name,
            "pillar": pillar_name,
            **(await _area_summary(session, area)),
        }
        for area, pillar_name in rows
    ]


@router.get("/areas/{area_id}/dashboard")
async def get_area_dashboard(
    area_id: uuid.UUID,
    period: date | None = None,
    session: AsyncSession = Depends(get_session),
):
    area = await session.get(Area, area_id)
    if area is None:
        raise HTTPException(status_code=404, detail="Area not found")

    resolved_period = await _resolve_period(session, period)

    department_score = await session.scalar(
        select(DepartmentScore)
        .where(DepartmentScore.area_id == area_id)
        .where(DepartmentScore.period == resolved_period)
    )
    prior_department_score = await session.scalar(
        select(DepartmentScore)
        .where(DepartmentScore.area_id == area_id)
        .where(DepartmentScore.period < resolved_period)
        .order_by(DepartmentScore.period.desc())
        .limit(1)
    )

    score_mom_delta = (
        float(department_score.score) - float(prior_department_score.score)
        if prior_department_score is not None
        else None
    )

    indicators = (
        await session.scalars(
            select(Indicator)
            .join(IndicatorDepartment, IndicatorDepartment.indicator_id == Indicator.id)
            .where(IndicatorDepartment.area_id == area_id)
        )
    ).all()
    kpis = [await _kpi_row(session, indicator, resolved_period) for indicator in indicators]

    return {
        "period": department_score.period.isoformat(),
        "score": float(department_score.score),
        "grade": department_score.grade,
        "score_mom_delta": score_mom_delta,
        "kpis": kpis,
    }
