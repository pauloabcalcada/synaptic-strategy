from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import IndicatorResult
from app.services.scoring import GRADE_BRACKETS, STATUS_TOLERANCE

router = APIRouter()


@router.get("/meta")
async def get_meta(session: AsyncSession = Depends(get_session)):
    current_period = await session.scalar(select(func.max(IndicatorResult.period)))
    return {
        "current_period": current_period,
        "grade_brackets": GRADE_BRACKETS,
        "status_tolerance": STATUS_TOLERANCE,
    }
