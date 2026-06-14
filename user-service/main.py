from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models
import schemas
import auth

app = FastAPI(title="User Service", version="1.0.0")

EDITABLE_FIELDS = {
    "full_name",
    "phone_number",
    "address_street",
    "address_city",
    "address_postal_code",
    "address_country",
}


@app.get("/health")
def health():
    return {"status": "ok", "service": "user-service"}


@app.get("/users/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user


@app.patch("/users/me", response_model=schemas.UserResponse)
def update_me(
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field in EDITABLE_FIELDS:
            setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    ctx: auth.AuthContext = Depends(auth.get_auth_context),
):
    if ctx.user.id != user_id and "admin" not in ctx.roles:
        raise HTTPException(status_code=403, detail="Forbidden")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/users", response_model=list[schemas.UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: auth.AuthContext = Depends(auth.require_admin),
):
    return db.query(models.User).offset(skip).limit(limit).all()
