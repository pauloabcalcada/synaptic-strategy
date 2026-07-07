"""Shared indicator context assembly for AI features (diagnostic, action plan, chat)."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Area, Indicator, IndicatorResult


async def build_indicator_context(
    session: AsyncSession,
    indicator: Indicator,
    *,
    period: date | None = None,
    history_length: int,
) -> dict:
    """Assemble indicator metadata, current result/target, and result history.

    When `period` is given, `current` is the result for that exact period and
    history is capped at that period. When omitted, `current` is the most
    recent result on record and history has no upper bound.
    """
    area = (
        await session.scalar(select(Area).where(Area.id == indicator.area_id))
        if indicator.area_id
        else None
    )

    history_query = (
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .order_by(IndicatorResult.period.desc())
        .limit(history_length)
    )
    if period is not None:
        history_query = history_query.where(IndicatorResult.period <= period)
    history_rows = (await session.scalars(history_query)).all()

    if period is not None:
        current = await session.scalar(
            select(IndicatorResult)
            .where(IndicatorResult.indicator_id == indicator.id)
            .where(IndicatorResult.period == period)
        )
    else:
        current = history_rows[0] if history_rows else None

    history = "\n".join(
        f"{row.period.isoformat()}: result={row.result}, target={row.target}, "
        f"status={row.status}"
        for row in reversed(history_rows)
    )

    return {
        "indicator_name": indicator.name,
        "unit": indicator.unit,
        "pillar_name": area.name if area else "unknown",
        "calculation_method": indicator.calculation_method,
        "result": current.result if current else None,
        "target": current.target if current else None,
        "history": history,
    }
