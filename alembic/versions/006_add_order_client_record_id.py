"""add orders.client_record_id for mobile offline sync idempotency

Revision ID: 006
Revises: 005
Create Date: 2026-07-29
"""
from alembic import op
import sqlalchemy as sa

revision = '006'
down_revision = '005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'orders' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'client_record_id' not in existing:
            op.add_column('orders', sa.Column('client_record_id', sa.String(length=100), nullable=True))
            op.create_index(
                'ix_orders_client_record_id',
                'orders',
                ['client_record_id'],
                unique=True,
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'orders' in inspector.get_table_names():
        existing_indexes = [i['name'] for i in inspector.get_indexes('orders')]
        if 'ix_orders_client_record_id' in existing_indexes:
            op.drop_index('ix_orders_client_record_id', table_name='orders')
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'client_record_id' in existing:
            op.drop_column('orders', 'client_record_id')
