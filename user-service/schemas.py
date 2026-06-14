from pydantic import BaseModel, Field
from datetime import datetime


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    is_active: bool
    created_at: datetime
    phone_number: str | None = None
    address_street: str | None = None
    address_city: str | None = None
    address_postal_code: str | None = None
    address_country: str | None = None

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=200)
    phone_number: str | None = Field(default=None, max_length=30)
    address_street: str | None = Field(default=None, max_length=200)
    address_city: str | None = Field(default=None, max_length=100)
    address_postal_code: str | None = Field(default=None, max_length=20)
    address_country: str | None = Field(default=None, max_length=100)
