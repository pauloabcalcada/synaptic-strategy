"""Indicator Chat: stream data-grounded answers about a KPI as SSE frames."""

from __future__ import annotations

from typing import AsyncIterator

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.models import Indicator
from app.services.ai.context import build_indicator_context
from app.services.ai.degraded_mode import is_degraded
from app.services.ai.prompts import CHAT_PROMPT_V1

HISTORY_LENGTH = 36

MOCK_CHAT_TEMPLATE = (
    "This is a mock chat response: {indicator_name} is currently at {result} "
    "{unit}, against a target of {target} {unit}."
)


async def _stream_mock(context: dict) -> AsyncIterator[str]:
    answer = MOCK_CHAT_TEMPLATE.format(**context)
    for word in answer.split(" "):
        yield f"data: {word} \n\n"


async def _stream_openai(
    settings: Settings, context: dict, messages: list
) -> AsyncIterator[str]:
    llm = ChatOpenAI(model=settings.OPENAI_CHAT_MODEL, api_key=settings.OPENAI_API_KEY)
    system_prompt = CHAT_PROMPT_V1.format(**context)
    chat_messages = [SystemMessage(content=system_prompt)]
    for message in messages:
        if message.role == "user":
            chat_messages.append(HumanMessage(content=message.content))
        else:
            chat_messages.append(AIMessage(content=message.content))

    async for chunk in llm.astream(chat_messages):
        if chunk.content:
            yield f"data: {chunk.content}\n\n"


async def stream_chat(
    session: AsyncSession,
    indicator: Indicator,
    messages: list,
    dry_run: bool,
) -> AsyncIterator[str]:
    settings = Settings()
    context = await build_indicator_context(
        session, indicator, history_length=HISTORY_LENGTH
    )

    if is_degraded(dry_run, settings):
        async for frame in _stream_mock(context):
            yield frame
        return

    async for frame in _stream_openai(settings, context, messages):
        yield frame
