"""add_missing_flow_fields

Revision ID: 78694fe02e8b
Revises: 94f1fad74dc6
Create Date: 2026-03-23 15:26:18.223801

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '78694fe02e8b'
down_revision: Union[str, Sequence[str], None] = '94f1fad74dc6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### Manually added missing fields that were in models but not in migrations ###
    
    # Reservation table additions
    op.add_column('reservation', sa.Column('is_bonus_eligible', sa.Boolean(), server_default=sa.text("true"), nullable=False))
    op.add_column('reservation', sa.Column('is_tovar_skidka', sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column('reservation', sa.Column('source_invoice_id', sa.Integer(), sa.ForeignKey("invoice.id"), nullable=True))
    op.add_column('reservation', sa.Column('is_deletion_pending', sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column('reservation', sa.Column('deletion_requested_by_id', sa.Integer(), sa.ForeignKey("user.id"), nullable=True))
    
    # Invoice table additions
    op.add_column('invoice', sa.Column('factura_number', sa.String(), nullable=True))
    op.add_column('invoice', sa.Column('realization_date', sa.DateTime(), nullable=True))
    op.add_column('invoice', sa.Column('promo_balance', sa.Float(), server_default=sa.text("0.0"), nullable=False))
    op.add_column('invoice', sa.Column('is_deletion_pending', sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column('invoice', sa.Column('deletion_requested_by_id', sa.Integer(), sa.ForeignKey("user.id"), nullable=True))

    # Fix is_return_pending nullable change
    op.alter_column('reservation', 'is_return_pending',
               existing_type=sa.BOOLEAN(),
               nullable=True,
               existing_server_default=sa.text('false'))


def downgrade() -> None:
    """Downgrade schema."""
    op.alter_column('reservation', 'is_return_pending',
               existing_type=sa.BOOLEAN(),
               nullable=False,
               existing_server_default=sa.text('false'))
    
    op.drop_column('invoice', 'deletion_requested_by_id')
    op.drop_column('invoice', 'is_deletion_pending')
    op.drop_column('invoice', 'promo_balance')
    op.drop_column('invoice', 'realization_date')
    op.drop_column('invoice', 'factura_number')
    
    op.drop_column('reservation', 'deletion_requested_by_id')
    op.drop_column('reservation', 'is_deletion_pending')
    op.drop_column('reservation', 'source_invoice_id')
    op.drop_column('reservation', 'is_tovar_skidka')
    op.drop_column('reservation', 'is_bonus_eligible')
