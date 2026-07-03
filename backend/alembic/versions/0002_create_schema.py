"""Create full schema.

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-02

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "strategic_pillars",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("description", sa.Text),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "areas",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column(
            "pillar_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("strategic_pillars.id"),
        ),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "indicators",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.Text, unique=True, nullable=False),
        sa.Column("name", sa.Text, nullable=False),
        sa.Column("unit", sa.Text, nullable=False),
        sa.Column("polarity", sa.Text),
        sa.Column("calculation_method", sa.Text),
        sa.Column("composition", sa.Text),
        sa.Column("accumulation_type", sa.Text),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("areas.id"),
        ),
        sa.Column("active", sa.Boolean, server_default=sa.text("true")),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "polarity IN ('higher_is_better', 'lower_is_better')",
            name="ck_indicators_polarity",
        ),
        sa.CheckConstraint(
            "accumulation_type IN ('last', 'average', 'sum')",
            name="ck_indicators_accumulation_type",
        ),
    )

    op.create_table(
        "indicator_departments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("indicators.id"),
        ),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("areas.id"),
        ),
        sa.Column("weight", sa.Numeric, nullable=False),
        sa.Column("is_primary_owner", sa.Boolean, server_default=sa.text("false")),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "weight > 0 AND weight <= 1",
            name="ck_indicator_departments_weight",
        ),
        sa.UniqueConstraint("indicator_id", "area_id", name="uq_indicator_departments"),
    )

    op.create_table(
        "indicator_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("indicators.id"),
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("result", sa.Numeric),
        sa.Column("target", sa.Numeric),
        sa.Column("status", sa.Text),
        sa.Column("kpi_score", sa.Numeric),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "status IN ('on_track', 'at_risk', 'off_track')",
            name="ck_indicator_results_status",
        ),
        sa.UniqueConstraint("indicator_id", "period", name="uq_indicator_results"),
    )

    op.create_table(
        "department_scores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("areas.id"),
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("score", sa.Numeric),
        sa.Column("grade", sa.Text),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "grade IN ('A', 'B', 'C', 'D')",
            name="ck_department_scores_grade",
        ),
        sa.UniqueConstraint("area_id", "period", name="uq_department_scores"),
    )

    op.create_table(
        "commentaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("indicators.id"),
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("is_ai_generated", sa.Boolean, server_default=sa.text("false")),
        sa.Column("author_id", postgresql.UUID(as_uuid=True)),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "action_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("indicators.id"),
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("content", postgresql.JSONB),
        sa.Column("created_by", postgresql.UUID(as_uuid=True)),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "ai_diagnostics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "indicator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("indicators.id"),
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("pattern", sa.Text),
        sa.Column("confidence", sa.Text),
        sa.Column("description", sa.Text),
        sa.Column("suggested_focus", sa.Text),
        sa.Column(
            "generated_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("indicator_id", "period", name="uq_ai_diagnostics"),
    )

    op.create_table(
        "rag_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("filename", sa.Text, nullable=False),
        sa.Column("document_type", sa.Text),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("areas.id"),
        ),
        sa.Column("period", sa.Date),
        sa.Column(
            "ingested_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("now()"),
        ),
        sa.CheckConstraint(
            "document_type IN ('knowledge_base', 'meeting_minutes')",
            name="ck_rag_documents_document_type",
        ),
    )


def downgrade() -> None:
    # Drop in reverse FK order to avoid constraint violations.
    op.drop_table("rag_documents")
    op.drop_table("ai_diagnostics")
    op.drop_table("action_plans")
    op.drop_table("commentaries")
    op.drop_table("department_scores")
    op.drop_table("indicator_results")
    op.drop_table("indicator_departments")
    op.drop_table("indicators")
    op.drop_table("areas")
    op.drop_table("strategic_pillars")
