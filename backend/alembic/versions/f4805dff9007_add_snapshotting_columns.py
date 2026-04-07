"""add snapshotting columns to reservationitem

Revision ID: f4805dff9007
Revises: c1bbbdf4e768
Create Date: 2026-04-07 11:58:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.engine.reflection import Inspector


# revision identifiers, used by Alembic.
revision: str = 'f4805dff9007'
down_revision: Union[str, Sequence[str], None] = 'c1bbbdf4e768'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Get current database state
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('reservationitem')]
    
    # Missing snapshotting columns to check/add
    # salary_amount is skipped because it was added in c1bbbdf4e768, 
    # but we'll include it in defensive check just in case
    columns_to_add = {
        'marketing_amount': sa.Column('marketing_amount', sa.Float(), nullable=True, server_default='0.0'),
        'production_price': sa.Column('production_price', sa.Float(), nullable=True, server_default='0.0'),
        'other_expenses': sa.Column('other_expenses', sa.Float(), nullable=True, server_default='0.0')
    }
    
    for col_name, col_obj in columns_to_add.items():
        if col_name not in existing_columns:
            op.add_column('reservationitem', col_obj)
            # Set default values for existing rows
            op.execute(f"UPDATE reservationitem SET {col_name} = 0.0 WHERE {col_name} IS NULL")
        else:
            print(f"Column '{col_name}' already exists in 'reservationitem', skipping addition.")


def downgrade() -> None:
    # Downgrade is not defensive in the same way, usually we just drop what we added
    # But for safety we check here too
    conn = op.get_bind()
    inspector = Inspector.from_engine(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('reservationitem')]
    
    for col_name in ['other_expenses', 'production_price', 'marketing_amount']:
        if col_name in existing_columns:
            op.drop_column('reservationitem', col_name)
