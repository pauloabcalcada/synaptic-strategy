from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Indicator
from app.services.ai.diagnostic import diagnose_deviation

router = APIRouter()


class DiagnoseDeviationRequest(BaseModel):
    code: str
    period: date
    dry_run: bool = False


@router.post("/ai/diagnose-deviation")
async def post_diagnose_deviation(
    payload: DiagnoseDeviationRequest,
    session: AsyncSession = Depends(get_session),
):
    indicator = await session.scalar(
        select(Indicator).where(Indicator.code == payload.code)
    )
    if indicator is None:
        raise HTTPException(status_code=404, detail="Indicator not found")

    return await diagnose_deviation(session, indicator, payload.period, payload.dry_run)
