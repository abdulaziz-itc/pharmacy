"""merge_paid_date_and_src_heads

Revision ID: d1f0aa94745c
Revises: 5c203414ae75, d64fe4e3_src
Create Date: 2026-05-05 07:30:22.215938

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd1f0aa94745c'
down_revision: Union[str, Sequence[str], None] = ('5c203414ae75', 'd64fe4e3_src')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
