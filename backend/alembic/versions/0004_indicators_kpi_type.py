"""Add kpi_type to indicators.

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "indicators",
        sa.Column("kpi_type", sa.Text, nullable=True),
    )
    op.create_check_constraint(
        "ck_indicators_kpi_type",
        "indicators",
        "kpi_type IN ('numerical', 'milestone')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_indicators_kpi_type", "indicators", type_="check")
    op.drop_column("indicators", "kpi_type")
