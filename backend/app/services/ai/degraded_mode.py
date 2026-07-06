"""Shared degraded-mode decision for all AI endpoints.

An endpoint runs in degraded (mock) mode when the caller explicitly asks for
it via `dry_run`, or when no OpenAI key is configured — the latter is logged
as a warning so an unintentionally-blank key in a deployed environment is
visible in the logs rather than silently mocking forever.
"""

import logging

from app.core.config import Settings

logger = logging.getLogger(__name__)


def is_degraded(dry_run: bool, settings: Settings) -> bool:
    if dry_run:
        return True
    if not settings.OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY is blank/missing; falling back to mock AI response")
        return True
    return False
