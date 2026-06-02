"""add category, brand, size, name_zh, image_url to products

Revision ID: 002
Revises: 001
Create Date: 2026-06-02
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('products', sa.Column('name_zh', sa.String(200), nullable=True))
    op.add_column('products', sa.Column('category', sa.String(100), nullable=True))
    op.add_column('products', sa.Column('sub_category', sa.String(100), nullable=True))
    op.add_column('products', sa.Column('brand', sa.String(100), nullable=True))
    op.add_column('products', sa.Column('size', sa.String(50), nullable=True))
    op.add_column('products', sa.Column('image_url', sa.String(500), nullable=True))


def downgrade():
    op.drop_column('products', 'image_url')
    op.drop_column('products', 'size')
    op.drop_column('products', 'brand')
    op.drop_column('products', 'sub_category')
    op.drop_column('products', 'category')
    op.drop_column('products', 'name_zh')
