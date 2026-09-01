"""rename legacy product SKU prefix MM-NNN -> MMI-NNN (keep the number)

Revision ID: 011
Revises: 010
Create Date: 2026-09-01
"""
from alembic import op
import sqlalchemy as sa

revision = '011'
down_revision = '010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'products' not in inspector.get_table_names():
        return
    # Only rename where the MMI- target is still free, so we never trip the
    # unique constraint on products.sku.
    op.execute(
        "UPDATE products SET sku = 'MMI-' || substr(sku, 4) "
        "WHERE sku LIKE 'MM-%' "
        "AND ('MMI-' || substr(sku, 4)) NOT IN (SELECT sku FROM products)"
    )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'products' not in inspector.get_table_names():
        return
    op.execute(
        "UPDATE products SET sku = 'MM-' || substr(sku, 5) "
        "WHERE sku LIKE 'MMI-%' "
        "AND ('MM-' || substr(sku, 5)) NOT IN (SELECT sku FROM products)"
    )
