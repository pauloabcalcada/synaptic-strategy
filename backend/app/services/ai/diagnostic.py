"""Deviation Diagnostic: classify why an off-track KPI deviated."""

from __future__ import annotations

import json
from datetime import date

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import AiDiagnostic, Area, Indicator, IndicatorResult
from app.services.ai.degraded_mode import is_degraded
from app.services.ai.prompts import DIAGNOSTIC_PROMPT_V1

HISTORY_LENGTH = 24

MOCK_DIAGNOSTIC = {
    "pattern": "sudden_drop",
    "confidence": "medium",
    "description": (
        "This is a mock diagnostic: the indicator shows a sharp single-period "
        "dip rather than a sustained decline."
    ),
    "suggested_focus": "Review what changed in the reporting period of the dip.",
}


async def _build_context(
    session: AsyncSession, indicator: Indicator, period: date
) -> dict:
    area = (
        await session.scalar(select(Area).where(Area.id == indicator.area_id))
        if indicator.area_id
        else None
    )
    current = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period == period)
    )
    history_rows = (
        await session.scalars(
            select(IndicatorResult)
            .where(IndicatorResult.indicator_id == indicator.id)
            .where(IndicatorResult.period <= period)
            .order_by(IndicatorResult.period.desc())
            .limit(HISTORY_LENGTH)
        )
    ).all()
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
        "period": period.isoformat(),
        "result": current.result if current else None,
        "target": current.target if current else None,
        "history": history,
    }


async def _call_openai(settings: Settings, context: dict) -> dict:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = DIAGNOSTIC_PROMPT_V1.format(**context)
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def diagnose_deviation(
    session: AsyncSession,
    indicator: Indicator,
    period: date,
    dry_run: bool,
) -> dict | None:
    existing = await session.scalar(
        select(AiDiagnostic)
        .where(AiDiagnostic.indicator_id == indicator.id)
        .where(AiDiagnostic.period == period)
    )
    if existing is not None:
        return {
            "pattern": existing.pattern,
            "confidence": existing.confidence,
            "description": existing.description,
            "suggested_focus": existing.suggested_focus,
        }

    current = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period == period)
    )
    if current is None or current.status != "off_track":
        return None

    settings = Settings()
    if is_degraded(dry_run, settings):
        result = MOCK_DIAGNOSTIC
    else:
        context = await _build_context(session, indicator, period)
        result = await _call_openai(settings, context)

    diagnostic = AiDiagnostic(
        indicator_id=indicator.id,
        period=period,
        pattern=result["pattern"],
        confidence=result["confidence"],
        description=result["description"],
        suggested_focus=result["suggested_focus"],
    )
    session.add(diagnostic)
    await session.commit()

    return result
