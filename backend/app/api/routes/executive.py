from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.services import executive_overview

router = APIRouter()


@router.get("/executive/overview")
async def get_executive_overview(session: AsyncSession = Depends(get_session)):
    return await executive_overview.build_overview(session)
