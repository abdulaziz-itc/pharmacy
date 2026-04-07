"""add snapshotting columns to reservationitem

Revision ID: f4805dff9007
Revises: f3794cff8006
Create Date: 2026-04-07 11:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4805dff9007'
down_revision: Union[str, Sequence[str], None] = 'f3794cff8006'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add columns to reservationitem
    op.add_column('reservationitem', sa.Column('marketing_amount', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('reservationitem', sa.Column('salary_amount', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('reservationitem', sa.Column('production_price', sa.Float(), nullable=True, server_default='0.0'))
    op.add_column('reservationitem', sa.Column('other_expenses', sa.Float(), nullable=True, server_default='0.0'))
    
    # Set default values for existing rows
    op.execute("UPDATE reservationitem SET marketing_amount = 0.0 WHERE marketing_amount IS NULL")
    op.execute("UPDATE reservationitem SET salary_amount = 0.0 WHERE salary_amount IS NULL")
    op.execute("UPDATE reservationitem SET production_price = 0.0 WHERE production_price IS NULL")
    op.execute("UPDATE reservationitem SET other_expenses = 0.0 WHERE other_expenses IS NULL")


def downgrade() -> None:
    op.drop_column('reservationitem', 'other_expenses')
    op.drop_column('reservationitem', 'production_price')
    op.drop_column('reservationitem', 'salary_amount')
    op.drop_column('reservationitem', 'marketing_amount')
