"""add wallet_transactions.reversed to guard against double-undo

Revision ID: 008
Revises: 007
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa

revision = '008'
down_revision = '007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'wallet_transactions' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('wallet_transactions')]
        if 'reversed' not in existing:
            op.add_column(
                'wallet_transactions',
                sa.Column('reversed', sa.Boolean(), nullable=False, server_default=sa.false()),
            )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'wallet_transactions' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('wallet_transactions')]
        if 'reversed' in existing:
            op.drop_column('wallet_transactions', 'reversed')
