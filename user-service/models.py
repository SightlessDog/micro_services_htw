from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class User(Base):
    """Local profile cache, keyed by the Zitadel `sub` claim. Lazily upserted
    on first authenticated request — Zitadel owns credentials and identity."""

    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Editable profile fields. Seeded from Zitadel claims on first login,
    # then user-managed — Zitadel changes do not overwrite these afterwards.
    phone_number = Column(String, nullable=True)
    address_street = Column(String, nullable=True)
    address_city = Column(String, nullable=True)
    address_postal_code = Column(String, nullable=True)
    address_country = Column(String, nullable=True)
