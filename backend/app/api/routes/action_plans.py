from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import ActionPlan, Indicator

router = APIRouter()


class ActionPlanUpsert(BaseModel):
    period: date
    content: dict
    author_id: str


async def _get_indicator_or_404(session: AsyncSession, code: str) -> Indicator:
    indicator = await session.scalar(select(Indicator).where(Indicator.code == code))
    if indicator is None:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return indicator


@router.get("/indicators/{code}/action-plan")
async def get_action_plan(
    code: str,
    period: date,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, code)

    action_plan = await session.scalar(
        select(ActionPlan)
        .where(ActionPlan.indicator_id == indicator.id)
        .where(ActionPlan.period == period)
    )

    return {
        "period": period.isoformat(),
        "content": action_plan.content if action_plan else None,
        "author_id": action_plan.author_id if action_plan else None,
    }


@router.put("/indicators/{code}/action-plan")
async def upsert_action_plan(
    code: str,
    payload: ActionPlanUpsert,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, code)

    action_plan = await session.scalar(
        select(ActionPlan)
        .where(ActionPlan.indicator_id == indicator.id)
        .where(ActionPlan.period == payload.period)
    )

    if action_plan is None:
        action_plan = ActionPlan(
            indicator_id=indicator.id,
            period=payload.period,
            content=payload.content,
            author_id=payload.author_id,
        )
        session.add(action_plan)
    else:
        action_plan.content = payload.content
        action_plan.author_id = payload.author_id

    await session.commit()

    return {
        "period": payload.period.isoformat(),
        "content": action_plan.content,
        "author_id": action_plan.author_id,
    }
