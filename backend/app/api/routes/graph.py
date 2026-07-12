from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import (
    AiDiagnostic,
    Area,
    DepartmentScore,
    Indicator,
    IndicatorDepartment,
    IndicatorResult,
)

router = APIRouter()


async def _resolve_latest_period(session: AsyncSession):
    return await session.scalar(select(func.max(IndicatorResult.period)))


async def _node_payload(
    session: AsyncSession, indicator: Indicator, latest_period
) -> dict:
    indicator_department, area = (
        await session.execute(
            select(IndicatorDepartment, Area)
            .join(Area, Area.id == IndicatorDepartment.area_id)
            .where(IndicatorDepartment.indicator_id == indicator.id)
            .where(IndicatorDepartment.is_primary_owner.is_(True))
        )
    ).first()

    department_score = await session.scalar(
        select(DepartmentScore)
        .where(DepartmentScore.area_id == area.id)
        .where(DepartmentScore.period == latest_period)
    )
    result_row = await session.scalar(
        select(IndicatorResult)
        .where(IndicatorResult.indicator_id == indicator.id)
        .where(IndicatorResult.period == latest_period)
    )
    diagnostic = await session.scalar(
        select(AiDiagnostic)
        .where(AiDiagnostic.indicator_id == indicator.id)
        .where(AiDiagnostic.period == latest_period)
    )

    return {
        "id": indicator.code,
        "label": indicator.name,
        "department": area.name,
        "score": float(department_score.score),
        "grade": department_score.grade,
        "weight": float(indicator_department.weight),
        "result": float(result_row.result),
        "target": float(result_row.target),
        "active_diagnostic": diagnostic is not None,
    }


def _edges_for(indicator: Indicator) -> list[dict]:
    return [
        {
            "source": indicator.code,
            "target": related["code"],
            "label": related["relationship"],
        }
        for related in indicator.related_kpis or []
    ]


@router.get("/graph/strategy-map")
async def get_strategy_map(session: AsyncSession = Depends(get_session)):
    indicators = (
        await session.scalars(select(Indicator).where(Indicator.active.is_(True)))
    ).all()

    latest_period = await _resolve_latest_period(session)

    nodes = [await _node_payload(session, indicator, latest_period) for indicator in indicators]
    edges = [edge for indicator in indicators for edge in _edges_for(indicator)]

    return {"nodes": nodes, "edges": edges}
