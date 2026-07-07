from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.models import Area, DepartmentScore, Indicator, IndicatorDepartment, IndicatorResult

router = APIRouter()


async def _resolve_latest_period(session: AsyncSession):
    return await session.scalar(select(func.max(IndicatorResult.period)))


@router.get("/graph/strategy-map")
async def get_strategy_map(session: AsyncSession = Depends(get_session)):
    indicators = (
        await session.scalars(select(Indicator).where(Indicator.active.is_(True)))
    ).all()

    latest_period = await _resolve_latest_period(session)

    nodes = []
    for indicator in indicators:
        owner_department = (
            await session.execute(
                select(IndicatorDepartment, Area)
                .join(Area, Area.id == IndicatorDepartment.area_id)
                .where(IndicatorDepartment.indicator_id == indicator.id)
                .where(IndicatorDepartment.is_primary_owner.is_(True))
            )
        ).first()
        indicator_department, area = owner_department

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

        nodes.append(
            {
                "id": indicator.code,
                "label": indicator.name,
                "department": area.name,
                "score": float(department_score.score),
                "grade": department_score.grade,
                "weight": float(indicator_department.weight),
                "result": float(result_row.result),
                "target": float(result_row.target),
            }
        )

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
