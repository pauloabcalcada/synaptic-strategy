import uuid

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class DepartmentScore(Base):
    __tablename__ = "department_scores"
    __table_args__ = (
        CheckConstraint(
            "grade IN ('A', 'B', 'C', 'D')",
            name="ck_department_scores_grade",
        ),
        UniqueConstraint("area_id", "period", name="uq_department_scores"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id")
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    score: Mapped[object] = mapped_column(Numeric, nullable=True)
    grade: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
