"""add source_payment_id to payment

Revision ID: d64fe4e3_src
Revises: fe5114d7986f
Create Date: 2026-04-21 22:20:00

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'd64fe4e3_src'
down_revision: Union[str, Sequence[str], None] = 'fe5114d7986f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Use batch_op for SQLite compatibility if needed, but here it's likely Postgres
    # Checking if column exists first to be safe
    conn = op.get_bind()
    res = conn.execute(sa.text("SELECT column_name FROM information_schema.columns WHERE table_name='payment' AND column_name='source_payment_id'"))
    if not res.fetchone():
        op.add_column('payment', sa.Column('source_payment_id', sa.Integer(), sa.ForeignKey('payment.id'), nullable=True))

def downgrade() -> None:
    op.drop_column('payment', 'source_payment_id')
