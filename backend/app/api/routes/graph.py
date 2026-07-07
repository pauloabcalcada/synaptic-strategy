from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Indicator

router = APIRouter()


@router.get("/graph/strategy-map")
async def get_strategy_map(session: AsyncSession = Depends(get_session)):
    indicators = (
        await session.scalars(select(Indicator).where(Indicator.active.is_(True)))
    ).all()

    nodes = [{"id": indicator.code} for indicator in indicators]

    edges = []
    for indicator in indicators:
        for related in indicator.related_kpis or []:
            edges.append(
                {
                    "source": indicator.code,
                    "target": related["code"],
                    "label": related["relationship"],
                }
            )

    return {"nodes": nodes, "edges": edges}
