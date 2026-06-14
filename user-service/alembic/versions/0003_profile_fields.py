"""add editable profile fields (phone, address)

Revision ID: 0003
Revises: 0002
Create Date: 2026-06-13 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(), nullable=True))
    op.add_column("users", sa.Column("address_street", sa.String(), nullable=True))
    op.add_column("users", sa.Column("address_city", sa.String(), nullable=True))
    op.add_column("users", sa.Column("address_postal_code", sa.String(), nullable=True))
    op.add_column("users", sa.Column("address_country", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "address_country")
    op.drop_column("users", "address_postal_code")
    op.drop_column("users", "address_city")
    op.drop_column("users", "address_street")
    op.drop_column("users", "phone_number")
