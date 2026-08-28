"""add products.category_zh (Chinese label for the product's category)

Revision ID: 010
Revises: 009
Create Date: 2026-08-28
"""
from alembic import op
import sqlalchemy as sa

revision = '010'
down_revision = '009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'products' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('products')]
        if 'category_zh' not in existing:
            op.add_column('products', sa.Column('category_zh', sa.String(length=100), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'products' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('products')]
        if 'category_zh' in existing:
            op.drop_column('products', 'category_zh')
