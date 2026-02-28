"""Add org_type to medicalorganization

Revision ID: 0f276939ee5b
Revises: 1f80e5f8601b
Create Date: 2026-02-27 22:45:17.478494

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f276939ee5b'
down_revision: Union[str, Sequence[str], None] = '1f80e5f8601b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('medicalorganization', sa.Column('org_type', sa.String(), nullable=True))
    op.add_column('medicalorganization', sa.Column('brand', sa.String(), nullable=True))
    op.add_column('medicalorganization', sa.Column('director_name', sa.String(), nullable=True))
    op.add_column('medicalorganization', sa.Column('contact_phone', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('medicalorganization', 'contact_phone')
    op.drop_column('medicalorganization', 'director_name')
    op.drop_column('medicalorganization', 'brand')
    op.drop_column('medicalorganization', 'org_type')
    # ### end Alembic commands ###
