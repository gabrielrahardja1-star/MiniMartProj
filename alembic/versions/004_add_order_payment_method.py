"""add orders.payment_method

Revision ID: 004
Revises: 003
Create Date: 2026-07-07
"""
from alembic import op
import sqlalchemy as sa

revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'orders' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'payment_method' not in existing:
            op.add_column(
                'orders',
                sa.Column('payment_method', sa.String(length=20), nullable=True),
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'orders' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'payment_method' in existing:
            op.drop_column('orders', 'payment_method')
