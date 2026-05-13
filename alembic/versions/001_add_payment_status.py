"""add payment_status to orders

Revision ID: 001
Revises:
Create Date: 2026-05-13
"""
from alembic import op
import sqlalchemy as sa

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    # Fresh DB: create_all() will create the table with the column already — skip
    if 'orders' not in inspector.get_table_names():
        return
    if 'payment_status' not in [c['name'] for c in inspector.get_columns('orders')]:
        op.add_column('orders', sa.Column('payment_status', sa.String(20), nullable=False, server_default='unpaid'))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'orders' in inspector.get_table_names():
        if 'payment_status' in [c['name'] for c in inspector.get_columns('orders')]:
            op.drop_column('orders', 'payment_status')
