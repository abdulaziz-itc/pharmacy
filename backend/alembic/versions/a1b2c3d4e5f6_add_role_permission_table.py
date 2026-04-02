"""add_role_permission_table

Revision ID: a1b2c3d4e5f6
Revises: 0fc2ae710b9b
Create Date: 2026-04-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0fc2ae710b9b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'role_permission',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('role', sa.String(), nullable=False, index=True),
        sa.Column('section_key', sa.String(), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), server_default='true'),
        sa.UniqueConstraint('role', 'section_key', name='uq_role_section'),
    )


def downgrade() -> None:
    op.drop_table('role_permission')
