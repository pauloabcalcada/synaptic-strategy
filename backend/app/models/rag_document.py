import uuid

from sqlalchemy import CheckConstraint, Date, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import TIMESTAMP, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class RagDocument(Base):
    __tablename__ = "rag_documents"
    __table_args__ = (
        CheckConstraint(
            "document_type IN ('knowledge_base', 'meeting_minutes')",
            name="ck_rag_documents_document_type",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    filename: Mapped[str] = mapped_column(Text, nullable=False)
    document_type: Mapped[str | None] = mapped_column(Text)
    area_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("areas.id")
    )
    period: Mapped[object] = mapped_column(Date, nullable=True)
    ingested_at: Mapped[object] = mapped_column(
        TIMESTAMP(timezone=True), server_default=func.now(), nullable=True
    )
