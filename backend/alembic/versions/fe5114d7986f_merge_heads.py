"""merge heads

Revision ID: fe5114d7986f
Revises: 44cb8b2841ef, c59c0d33c5f7
Create Date: 2026-04-17 07:11:51.330424

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fe5114d7986f'
down_revision: Union[str, Sequence[str], None] = ('44cb8b2841ef', 'c59c0d33c5f7')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
