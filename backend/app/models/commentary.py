import uuid

from sqlalchemy import Boolean, Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Commentary(Base):
    __tablename__ = "commentaries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indicators.id")
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    content: Mapped[str | None] = mapped_column(Text)
    is_ai_generated: Mapped[bool | None] = mapped_column(Boolean, server_default="false", nullable=True)
    author_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    created_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
    updated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
