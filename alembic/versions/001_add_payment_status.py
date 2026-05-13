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
    op.add_column('orders', sa.Column('payment_status', sa.String(20), nullable=False, server_default='unpaid'))


def downgrade() -> None:
    op.drop_column('orders', 'payment_status')
