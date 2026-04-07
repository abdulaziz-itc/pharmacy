"""add snapshotting columns to reservationitem

Revision ID: f4805dff9007
Revises: c1bbbdf4e768
Create Date: 2026-04-07 11:56:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4805dff9007'
down_revision: Union[str, Sequence[str], None] = 'c1bbbdf4e768'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing snapshotting columns to reservationitem
    # salary_amount is skipped because it was added in c1bbbdf4e768
    op.add_column('reservationitem', sa.Column('marketing_amount', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('reservationitem', sa.Column('production_price', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('reservationitem', sa.Column('other_expenses', sa.Float(), nullable=True, server_default='0.0'))
    
    # Set default values for existing rows
    op.execute("UPDATE reservationitem SET marketing_amount = 0.0 WHERE marketing_amount IS NULL")
    op.execute("UPDATE reservationitem SET production_price = 0.0 WHERE production_price IS NULL")
    op.execute("UPDATE reservationitem SET other_expenses = 0.0 WHERE other_expenses IS NULL")


def downgrade() -> None:
    op.drop_column('reservationitem', 'other_expenses')
    op.drop_column('reservationitem', 'production_price')
    # salary_amount is NOT dropped here because it belongs to c1bbbdf4e768
    op.drop_column('reservationitem', 'marketing_amount')
