"""Action plan upsert support: author_id as text, unique per indicator/period.

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("action_plans", "created_by", new_column_name="author_id")
    op.alter_column(
        "action_plans",
        "author_id",
        type_=sa.Text(),
        postgresql_using="author_id::text",
    )
    op.alter_column("action_plans", "indicator_id", nullable=False)
    op.create_unique_constraint(
        "uq_action_plans_indicator_period",
        "action_plans",
        ["indicator_id", "period"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "uq_action_plans_indicator_period", "action_plans", type_="unique"
    )
    op.alter_column("action_plans", "indicator_id", nullable=True)
    op.alter_column(
        "action_plans",
        "author_id",
        type_=sa.dialects.postgresql.UUID(as_uuid=True),
        postgresql_using="author_id::uuid",
    )
    op.alter_column("action_plans", "author_id", new_column_name="created_by")
