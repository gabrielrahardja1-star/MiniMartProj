"""add products.source_no/flagged/flag_reason and catalog_issues, for MMI catalog import

Revision ID: 009
Revises: 008
Create Date: 2026-08-26
"""
from alembic import op
import sqlalchemy as sa

revision = '009'
down_revision = '008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'products' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('products')]
        if 'source_no' not in existing:
            op.add_column('products', sa.Column('source_no', sa.Integer(), nullable=True))
        if 'flagged' not in existing:
            op.add_column(
                'products',
                sa.Column('flagged', sa.Boolean(), nullable=False, server_default=sa.false()),
            )
        if 'flag_reason' not in existing:
            op.add_column('products', sa.Column('flag_reason', sa.String(length=500), nullable=True))

    if 'catalog_issues' not in inspector.get_table_names():
        op.create_table(
            'catalog_issues',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('product_id', sa.Integer(), sa.ForeignKey('products.id'), nullable=True),
            sa.Column('source_no', sa.Integer(), nullable=True),
            sa.Column('sheet_row', sa.Integer(), nullable=True),
            sa.Column('issue', sa.String(length=500), nullable=False),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'catalog_issues' in inspector.get_table_names():
        op.drop_table('catalog_issues')

    if 'products' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('products')]
        if 'flag_reason' in existing:
            op.drop_column('products', 'flag_reason')
        if 'flagged' in existing:
            op.drop_column('products', 'flagged')
        if 'source_no' in existing:
            op.drop_column('products', 'source_no')
