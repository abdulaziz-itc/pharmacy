"""add comment to payment

Revision ID: 7acdea4d3c22
Revises: 6b0d948083d1
Create Date: 2026-03-23 17:40:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7acdea4d3c22'
down_revision: Union[str, Sequence[str], None] = '6b0d948083d1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Check if comment column already exists (idempotent migration)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('payment')]
    
    if 'comment' not in columns:
        op.add_column('payment', sa.Column('comment', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('payment', 'comment')
