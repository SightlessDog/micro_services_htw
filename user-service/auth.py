import json
import logging
import os
import time
import urllib.error
import urllib.request

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database import get_db
import models

ISSUER = os.environ["ZITADEL_ISSUER"]
AUDIENCE = os.environ["ZITADEL_AUDIENCE"]
_JWKS_URL = os.environ.get("ZITADEL_JWKS_URL", f"{ISSUER}/oauth/v2/keys")
_USERINFO_URL = os.environ.get("ZITADEL_USERINFO_URL", f"{ISSUER}/oidc/v1/userinfo")
_PLACEHOLDER_EMAIL_SUFFIX = "@unknown.local"
_ROLES_CLAIM = "urn:zitadel:iam:org:project:roles"
_USERINFO_CACHE_TTL_SECONDS = 60

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer()
_jwks_client = PyJWKClient(_JWKS_URL, cache_keys=True)

# Per-jti cache of userinfo (profile + role claims), swept on each write so it
# stays bounded by the number of distinct tokens seen within the TTL window.
_userinfo_cache: dict[str, tuple[float, dict]] = {}


def _decode(token: str) -> dict:
    try:
        signing_key = _jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=ISSUER,
            audience=AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def _fetch_userinfo(token: str, jti: str | None) -> dict:
    """Best-effort fetch of profile + role claims.

    Access tokens only carry `sub` — email/name/roles live on Zitadel's
    userinfo endpoint, requested with the same bearer token. Cached briefly
    per-jti to avoid a round trip on every request.
    """
    now = time.monotonic()

    if jti:
        cached = _userinfo_cache.get(jti)
        if cached and cached[0] > now:
            return cached[1]
        for key, (expires_at, _) in list(_userinfo_cache.items()):
            if expires_at <= now:
                del _userinfo_cache[key]

    request = urllib.request.Request(
        _USERINFO_URL, headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            userinfo = json.loads(response.read())
    except urllib.error.HTTPError as exc:
        logger.warning("userinfo fetch failed: %s %s", exc.code, exc.read())
        return {}
    except (urllib.error.URLError, ValueError) as exc:
        logger.warning("userinfo fetch failed: %s", exc)
        return {}

    if jti:
        _userinfo_cache[jti] = (now + _USERINFO_CACHE_TTL_SECONDS, userinfo)
    return userinfo


def _extract_roles(userinfo: dict) -> list[str]:
    claim = userinfo.get(_ROLES_CLAIM)
    return list(claim.keys()) if isinstance(claim, dict) else []


class AuthContext:
    def __init__(self, user: models.User, roles: list[str]) -> None:
        self.user = user
        self.roles = roles


def get_auth_context(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthContext:
    claims = _decode(credentials.credentials)
    sub = claims.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token missing subject")

    userinfo = _fetch_userinfo(credentials.credentials, claims.get("jti"))
    roles = _extract_roles(userinfo)

    user = db.query(models.User).filter(models.User.id == sub).first()

    if user is None:
        email = userinfo.get("email") or claims.get("email") or f"{sub}{_PLACEHOLDER_EMAIL_SUFFIX}"
        full_name = userinfo.get("name") or claims.get("name") or email
        user = models.User(id=sub, email=email, full_name=full_name)
        db.add(user)
        try:
            db.commit()
        except IntegrityError:
            # Concurrent first request for this user already inserted the row.
            db.rollback()
            user = db.query(models.User).filter(models.User.id == sub).first()
            if user is None:
                raise
        else:
            db.refresh(user)
    elif user.email.endswith(_PLACEHOLDER_EMAIL_SUFFIX):
        # Self-heal rows created before userinfo lookup existed.
        email = userinfo.get("email") or claims.get("email")
        if email:
            user.email = email
            user.full_name = userinfo.get("name") or claims.get("name") or email
            db.commit()
            db.refresh(user)

    return AuthContext(user=user, roles=roles)


def get_current_user(ctx: AuthContext = Depends(get_auth_context)) -> models.User:
    return ctx.user


def require_admin(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
    if "admin" not in ctx.roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return ctx
