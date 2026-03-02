"""Add missing fields to medicalorganization

Revision ID: 5c94a010a422
Revises: 0f276939ee5b
Create Date: 2026-02-28 07:18:28.183396

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c94a010a422'
down_revision: Union[str, Sequence[str], None] = '0f276939ee5b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute('ALTER TABLE medicalorganization ADD COLUMN IF NOT EXISTS brand VARCHAR')
    op.execute('ALTER TABLE medicalorganization ADD COLUMN IF NOT EXISTS director_name VARCHAR')
    op.execute('ALTER TABLE medicalorganization ADD COLUMN IF NOT EXISTS contact_phone VARCHAR')


def downgrade() -> None:
    """Downgrade schema."""
    op.execute('ALTER TABLE medicalorganization DROP COLUMN IF EXISTS contact_phone')
    op.execute('ALTER TABLE medicalorganization DROP COLUMN IF EXISTS director_name')
    op.execute('ALTER TABLE medicalorganization DROP COLUMN IF EXISTS brand')
