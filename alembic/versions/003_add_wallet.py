"""add worker wallet balance and transactions

Revision ID: 003
Revises: 002
Create Date: 2026-07-07
"""
from alembic import op
import sqlalchemy as sa

revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'workers' in tables:
        worker_columns = [c['name'] for c in inspector.get_columns('workers')]
        if 'balance' not in worker_columns:
            op.add_column(
                'workers',
                sa.Column('balance', sa.Numeric(10, 2), nullable=False, server_default='0'),
            )

    if 'wallet_transactions' not in tables:
        op.create_table(
            'wallet_transactions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('worker_id', sa.Integer(), nullable=False),
            sa.Column('type', sa.String(length=20), nullable=False),
            sa.Column('amount', sa.Numeric(10, 2), nullable=False),
            sa.Column('balance_after', sa.Numeric(10, 2), nullable=False),
            sa.Column('order_id', sa.Integer(), nullable=True),
            sa.Column('performed_by_worker_id', sa.Integer(), nullable=False),
            sa.Column('note', sa.String(length=255), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(['order_id'], ['orders.id']),
            sa.ForeignKeyConstraint(['performed_by_worker_id'], ['workers.id']),
            sa.ForeignKeyConstraint(['worker_id'], ['workers.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index(op.f('ix_wallet_transactions_id'), 'wallet_transactions', ['id'], unique=False)
        op.create_index(op.f('ix_wallet_transactions_worker_id'), 'wallet_transactions', ['worker_id'], unique=False)
        op.create_index(op.f('ix_wallet_transactions_created_at'), 'wallet_transactions', ['created_at'], unique=False)
        op.create_index('ix_wallet_tx_worker_created', 'wallet_transactions', ['worker_id', 'created_at'], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    tables = inspector.get_table_names()

    if 'wallet_transactions' in tables:
        existing_indexes = {idx['name'] for idx in inspector.get_indexes('wallet_transactions')}
        for index_name in (
            'ix_wallet_tx_worker_created',
            op.f('ix_wallet_transactions_created_at'),
            op.f('ix_wallet_transactions_worker_id'),
            op.f('ix_wallet_transactions_id'),
        ):
            if index_name in existing_indexes:
                op.drop_index(index_name, table_name='wallet_transactions')
        op.drop_table('wallet_transactions')

    if 'workers' in tables:
        worker_columns = [c['name'] for c in inspector.get_columns('workers')]
        if 'balance' in worker_columns:
            op.drop_column('workers', 'balance')
