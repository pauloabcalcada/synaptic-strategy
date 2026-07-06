from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Commentary, Indicator

router = APIRouter()


class CommentaryUpsert(BaseModel):
    period: date
    content: str
    author_id: str


async def _get_indicator_or_404(session: AsyncSession, code: str) -> Indicator:
    indicator = await session.scalar(select(Indicator).where(Indicator.code == code))
    if indicator is None:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return indicator


@router.get("/indicators/{code}/commentary")
async def get_commentary(
    code: str,
    period: date,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, code)

    commentary = await session.scalar(
        select(Commentary)
        .where(Commentary.indicator_id == indicator.id)
        .where(Commentary.period == period)
    )

    return {
        "period": period.isoformat(),
        "content": commentary.content if commentary else None,
        "is_ai_generated": commentary.is_ai_generated if commentary else False,
        "author_id": commentary.author_id if commentary else None,
    }


@router.put("/indicators/{code}/commentary")
async def upsert_commentary(
    code: str,
    payload: CommentaryUpsert,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, code)

    commentary = await session.scalar(
        select(Commentary)
        .where(Commentary.indicator_id == indicator.id)
        .where(Commentary.period == payload.period)
    )

    if commentary is None:
        commentary = Commentary(
            indicator_id=indicator.id,
            period=payload.period,
            content=payload.content,
            author_id=payload.author_id,
            is_ai_generated=False,
        )
        session.add(commentary)
    else:
        commentary.content = payload.content
        commentary.author_id = payload.author_id

    await session.commit()

    return {
        "period": payload.period.isoformat(),
        "content": commentary.content,
        "is_ai_generated": commentary.is_ai_generated,
        "author_id": commentary.author_id,
    }
