from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Indicator, IndicatorResult

router = APIRouter()

HISTORY_LENGTH = 24


async def _resolve_period(session: AsyncSession, period: date | None) -> date:
    if period is not None:
        return period
    return await session.scalar(select(func.max(IndicatorResult.period)))


@router.get("/indicators/{code}")
async def get_indicator_detail(
    code: str,
    period: date | None = None,
    session: AsyncSession = Depends(get_session),
):
    indicator = await session.scalar(select(Indicator).where(Indicator.code == code))
    if indicator is None:
        raise HTTPException(status_code=404, detail="Indicator not found")

    resolved_period = await _resolve_period(session, period)
    latest_period = await _resolve_period(session, None)

    current = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period == resolved_period)
    )

    history_rows = (
        await session.scalars(
            select(IndicatorResult)
            .where(IndicatorResult.indicator_id == indicator.id)
            .where(IndicatorResult.period <= latest_period)
            .order_by(IndicatorResult.period.desc())
            .limit(HISTORY_LENGTH)
        )
    ).all()
    history = [
        {
            "period": row.period.isoformat(),
            "result": float(row.result),
            "target": float(row.target),
            "kpi_score": float(row.kpi_score),
            "status": row.status,
        }
        for row in reversed(history_rows)
    ]

    return {
        "name": indicator.name,
        "code": indicator.code,
        "unit": indicator.unit,
        "polarity": indicator.polarity,
        "calculation_method": indicator.calculation_method,
        "composition": indicator.composition,
        "accumulation_type": indicator.accumulation_type,
        "kpi_type": indicator.kpi_type,
        "period": current.period.isoformat(),
        "result": float(current.result),
        "target": float(current.target),
        "kpi_score": float(current.kpi_score),
        "status": current.status,
        "history": history,
    }
