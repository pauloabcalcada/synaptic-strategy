"""Create area_commentaries table.

Revision ID: 0007
Revises: 0006
Create Date: 2026-07-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "area_commentaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "area_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("areas.id"),
            nullable=False,
        ),
        sa.Column("period", sa.Date, nullable=False),
        sa.Column("content", sa.Text),
        sa.Column("is_ai_generated", sa.Boolean, server_default=sa.text("false")),
        sa.Column("author_id", sa.Text),
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
        sa.UniqueConstraint("area_id", "period", name="uq_area_commentaries_area_period"),
    )


def downgrade() -> None:
    op.drop_table("area_commentaries")
