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
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    # Fresh DB: create_all() will create the table with these columns already — skip
    if 'products' not in inspector.get_table_names():
        return
    existing = [c['name'] for c in inspector.get_columns('products')]
    new_columns = [
        ('name_zh',      sa.Column('name_zh',      sa.String(200), nullable=True)),
        ('category',     sa.Column('category',     sa.String(100), nullable=True)),
        ('sub_category', sa.Column('sub_category', sa.String(100), nullable=True)),
        ('brand',        sa.Column('brand',        sa.String(100), nullable=True)),
        ('size',         sa.Column('size',         sa.String(50),  nullable=True)),
        ('image_url',    sa.Column('image_url',    sa.String(500), nullable=True)),
    ]
    for col_name, col_def in new_columns:
        if col_name not in existing:
            op.add_column('products', col_def)


def downgrade():
    op.drop_column('products', 'image_url')
    op.drop_column('products', 'size')
    op.drop_column('products', 'brand')
    op.drop_column('products', 'sub_category')
    op.drop_column('products', 'category')
    op.drop_column('products', 'name_zh')
