"""add orders.pickup_date and orders.pickup_slot

Revision ID: 005
Revises: 004
Create Date: 2026-07-13
"""
from alembic import op
import sqlalchemy as sa

revision = '005'
down_revision = '004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'orders' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'pickup_date' not in existing:
            op.add_column('orders', sa.Column('pickup_date', sa.Date(), nullable=True))
        if 'pickup_slot' not in existing:
            op.add_column('orders', sa.Column('pickup_slot', sa.String(length=10), nullable=True))

    with op.batch_alter_table('orders') as batch_op:
        batch_op.create_check_constraint(
            'ck_orders_pickup_slot_valid',
            "pickup_slot IN ('12:00', '17:00') OR pickup_slot IS NULL",
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'orders' in inspector.get_table_names():
        with op.batch_alter_table('orders') as batch_op:
            batch_op.drop_constraint('ck_orders_pickup_slot_valid', type_='check')
        existing = [c['name'] for c in inspector.get_columns('orders')]
        if 'pickup_slot' in existing:
            op.drop_column('orders', 'pickup_slot')
        if 'pickup_date' in existing:
            op.drop_column('orders', 'pickup_date')
