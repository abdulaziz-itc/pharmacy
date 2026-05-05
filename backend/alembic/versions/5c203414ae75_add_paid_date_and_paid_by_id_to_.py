"""Add paid_date and paid_by_id to BonusLedger

Revision ID: 5c203414ae75
Revises: d64fe4e3_src
Create Date: 2026-05-05 06:56:39.476478

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c203414ae75'
down_revision: Union[str, Sequence[str], None] = 'c59c0d33c5f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('bonus_ledger', sa.Column('paid_date', sa.DateTime(), nullable=True))
    op.add_column('bonus_ledger', sa.Column('paid_by_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_bonus_ledger_paid_by_id', 'bonus_ledger', 'user', ['paid_by_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('fk_bonus_ledger_paid_by_id', 'bonus_ledger', type_='foreignkey')
    op.drop_column('bonus_ledger', 'paid_by_id')
    op.drop_column('bonus_ledger', 'paid_date')
