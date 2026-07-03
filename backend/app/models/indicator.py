import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Indicator(Base):
    __tablename__ = "indicators"
    __table_args__ = (
        CheckConstraint(
            "polarity IN ('higher_is_better', 'lower_is_better')",
            name="ck_indicators_polarity",
        ),
        CheckConstraint(
            "accumulation_type IN ('last', 'average', 'sum')",
            name="ck_indicators_accumulation_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    polarity: Mapped[str | None] = mapped_column(Text)
    calculation_method: Mapped[str | None] = mapped_column(Text)
    composition: Mapped[str | None] = mapped_column(Text)
    accumulation_type: Mapped[str | None] = mapped_column(Text)
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id")
    )
    active: Mapped[bool | None] = mapped_column(Boolean, server_default="true", nullable=True)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
