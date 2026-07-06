import uuid

from sqlalchemy import Date, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class ActionPlan(Base):
    __tablename__ = "action_plans"
    __table_args__ = (
        UniqueConstraint(
            "indicator_id", "period", name="uq_action_plans_indicator_period"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indicators.id"), nullable=False
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    content: Mapped[object] = mapped_column(JSONB, nullable=True)
    author_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
