import uuid

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class IndicatorResult(Base):
    __tablename__ = "indicator_results"
    __table_args__ = (
        CheckConstraint(
            "status IN ('on_track', 'at_risk', 'off_track')",
            name="ck_indicator_results_status",
        ),
        UniqueConstraint("indicator_id", "period", name="uq_indicator_results"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indicators.id")
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    result: Mapped[object] = mapped_column(Numeric, nullable=True)
    target: Mapped[object] = mapped_column(Numeric, nullable=True)
    status: Mapped[str | None] = mapped_column(Text)
    kpi_score: Mapped[object] = mapped_column(Numeric, nullable=True)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
