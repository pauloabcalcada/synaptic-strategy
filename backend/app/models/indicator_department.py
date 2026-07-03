import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class IndicatorDepartment(Base):
    __tablename__ = "indicator_departments"
    __table_args__ = (
        CheckConstraint(
            "weight > 0 AND weight <= 1",
            name="ck_indicator_departments_weight",
        ),
        UniqueConstraint("indicator_id", "area_id", name="uq_indicator_departments"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indicators.id")
    )
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id")
    )
    weight: Mapped[object] = mapped_column(Numeric, nullable=False)
    is_primary_owner: Mapped[bool | None] = mapped_column(Boolean, server_default="false", nullable=True)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
