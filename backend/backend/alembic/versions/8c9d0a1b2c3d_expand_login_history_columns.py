"""expand_login_history_columns

Revision ID: 8c9d0a1b2c3d
Revises: 7b8e9f0a1b2c
Create Date: 2026-03-27 22:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c9d0a1b2c3d'
down_revision: Union[str, Sequence[str], None] = '7b8e9f0a1b2c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Change columns to Text to ensure no truncation
    op.alter_column('userloginhistory', 'location',
               existing_type=sa.String(),
               type_=sa.Text(),
               existing_nullable=True)
    op.alter_column('userloginhistory', 'user_agent',
               existing_type=sa.String(),
               type_=sa.Text(),
               existing_nullable=True)


def downgrade() -> None:
    op.alter_column('userloginhistory', 'user_agent',
               existing_type=sa.Text(),
               type_=sa.String(),
               existing_nullable=True)
    op.alter_column('userloginhistory', 'location',
               existing_type=sa.Text(),
               type_=sa.String(),
               existing_nullable=True)
