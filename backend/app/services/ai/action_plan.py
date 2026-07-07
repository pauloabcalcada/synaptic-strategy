"""Action Plan Generator: draft an ephemeral recovery plan for a KPI."""

from __future__ import annotations

import json
from datetime import date

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Indicator
from app.services.ai.context import build_indicator_context
from app.services.ai.degraded_mode import is_degraded
from app.services.ai.prompts import ACTION_PLAN_PROMPT_V1

HISTORY_LENGTH = 24

MOCK_ACTION_PLAN = {
    "probable_causes": [
        "This is a mock action plan: a likely operational bottleneck in the "
        "reporting period."
    ],
    "actions": [
        {
            "action": "Review the process step most correlated with the deviation.",
            "responsible": "area_manager",
            "deadline_type": "short_term",
        }
    ],
    "monitoring_suggestion": "Track the indicator weekly until it returns on track.",
}


async def _call_openai(settings: Settings, context: dict) -> dict:
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = ACTION_PLAN_PROMPT_V1.format(**context)
    response = await client.chat.completions.create(
        model=settings.OPENAI_CHAT_MODEL,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)


async def generate_action_plan(
    session: AsyncSession,
    indicator: Indicator,
    period: date,
    dry_run: bool,
) -> dict:
    settings = Settings()
    if is_degraded(dry_run, settings):
        return MOCK_ACTION_PLAN

    context = await build_indicator_context(
        session, indicator, period=period, history_length=HISTORY_LENGTH
    )
    context["period"] = period.isoformat()
    return await _call_openai(settings, context)
