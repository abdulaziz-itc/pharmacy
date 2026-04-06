"""add med_org_id to plan

Revision ID: 6b0d948083d1
Revises: 78694fe02e8b
Create Date: 2026-03-23 16:56:36.594429

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '6b0d948083d1'
down_revision: Union[str, Sequence[str], None] = '78694fe02e8b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('plan', sa.Column('med_org_id', sa.Integer(), sa.ForeignKey('medicalorganization.id'), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('plan', 'med_org_id')
