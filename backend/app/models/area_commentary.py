import uuid

from sqlalchemy import Boolean, Date, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AreaCommentary(Base):
    __tablename__ = "area_commentaries"
    __table_args__ = (
        UniqueConstraint("area_id", "period", name="uq_area_commentaries_area_period"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    area_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id"), nullable=False
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    is_ai_generated: Mapped[bool | None] = mapped_column(Boolean, server_default="false", nullable=True)
    author_id: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
