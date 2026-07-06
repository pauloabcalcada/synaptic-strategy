"""Commentary upsert support: author_id as text, unique per indicator/period.

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "commentaries",
        "author_id",
        type_=sa.Text(),
        postgresql_using="author_id::text",
    )
    op.alter_column("commentaries", "indicator_id", nullable=False)
    op.create_unique_constraint(
        "uq_commentaries_indicator_period",
        "commentaries",
        ["indicator_id", "period"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_commentaries_indicator_period", "commentaries", type_="unique"
    )
    op.alter_column("commentaries", "indicator_id", nullable=True)
    op.alter_column(
        "commentaries",
        "author_id",
        type_=sa.dialects.postgresql.UUID(as_uuid=True),
        postgresql_using="author_id::uuid",
    )
