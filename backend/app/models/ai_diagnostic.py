import uuid

from sqlalchemy import Date, ForeignKey, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AiDiagnostic(Base):
    __tablename__ = "ai_diagnostics"
    __table_args__ = (
        UniqueConstraint("indicator_id", "period", name="uq_ai_diagnostics"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    indicator_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("indicators.id")
    )
    period: Mapped[object] = mapped_column(Date, nullable=False)
    pattern: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[str | None] = mapped_column(Text)
    description: Mapped[str | None] = mapped_column(Text)
    suggested_focus: Mapped[str | None] = mapped_column(Text)
    generated_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
