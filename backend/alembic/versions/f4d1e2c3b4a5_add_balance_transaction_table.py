"""Add balance_transaction table

Revision ID: f4d1e2c3b4a5
Revises: c1bbbdf4e768
Create Date: 2026-04-08 21:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f4d1e2c3b4a5'
down_revision: Union[str, Sequence[str], None] = 'c1bbbdf4e768'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # 1. Create balance_transaction table
    op.create_table('balance_transaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', sa.Integer(), nullable=False),
        sa.Column('amount', sa.Float(), nullable=False),
        sa.Column('transaction_type', sa.String(), nullable=True),
        sa.Column('related_invoice_id', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['medicalorganization.id'], ),
        sa.ForeignKeyConstraint(['related_invoice_id'], ['invoice.id'], ),
        sa.ForeignKeyConstraint(['payment_id'], ['payment.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_balance_transaction_id'), 'balance_transaction', ['id'], unique=False)
    
    # 2. Ensure credit_balance column exists in medicalorganization (if not already added by previous branch)
    # Using a batch operation or check to avoid errors if it exists
    # but for simplicity in this dev flow we add it if not exists.
    # Note: Alembic doesn't have a native 'add if not exists', but we can use op.get_bind() to check.
    
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    columns = [c['name'] for c in inspector.get_columns('medicalorganization')]
    if 'credit_balance' not in columns:
        op.add_column('medicalorganization', sa.Column('credit_balance', sa.Float(), server_default='0.0', nullable=True))

def downgrade() -> None:
    op.drop_index(op.f('ix_balance_transaction_id'), table_name='balance_transaction')
    op.drop_table('balance_transaction')
    # We typically don't drop columns in downgrade if they might contain data, 
    # but for completeness:
    # op.drop_column('medicalorganization', 'credit_balance')
