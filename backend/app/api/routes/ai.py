from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Indicator
from app.services.ai.action_plan import generate_action_plan
from app.services.ai.diagnostic import diagnose_deviation

router = APIRouter()


class DiagnoseDeviationRequest(BaseModel):
    code: str
    period: date
    dry_run: bool = False


class GenerateActionPlanRequest(BaseModel):
    code: str
    period: date
    dry_run: bool = False


async def _get_indicator_or_404(session: AsyncSession, code: str) -> Indicator:
    indicator = await session.scalar(select(Indicator).where(Indicator.code == code))
    if indicator is None:
        raise HTTPException(status_code=404, detail="Indicator not found")
    return indicator


@router.post("/ai/diagnose-deviation")
async def post_diagnose_deviation(
    payload: DiagnoseDeviationRequest,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, payload.code)

    return await diagnose_deviation(session, indicator, payload.period, payload.dry_run)


@router.post("/ai/generate-action-plan")
async def post_generate_action_plan(
    payload: GenerateActionPlanRequest,
    session: AsyncSession = Depends(get_session),
):
    indicator = await _get_indicator_or_404(session, payload.code)

    return await generate_action_plan(
        session, indicator, payload.period, payload.dry_run
    )
