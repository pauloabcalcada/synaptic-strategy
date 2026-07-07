"""Deviation Diagnostic: classify why an off-track KPI deviated."""

from __future__ import annotations

import json
from datetime import date

from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import AiDiagnostic, Indicator, IndicatorResult
from app.services.ai.context import build_indicator_context
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
        context = await build_indicator_context(
            session, indicator, period=period, history_length=HISTORY_LENGTH
        )
        context["period"] = period.isoformat()
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
