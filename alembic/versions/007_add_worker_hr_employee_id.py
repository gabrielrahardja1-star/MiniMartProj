"""add workers.hr_employee_id for the official HR/payroll employee ID

Revision ID: 007
Revises: 006
Create Date: 2026-08-21
"""
from alembic import op
import sqlalchemy as sa

revision = '007'
down_revision = '006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if 'workers' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('workers')]
        if 'hr_employee_id' not in existing:
            op.add_column('workers', sa.Column('hr_employee_id', sa.String(length=50), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'workers' in inspector.get_table_names():
        existing = [c['name'] for c in inspector.get_columns('workers')]
        if 'hr_employee_id' in existing:
            op.drop_column('workers', 'hr_employee_id')
