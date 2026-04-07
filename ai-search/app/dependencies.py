from fastapi import Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.services import jwt_service
from app.repositories.document_repository import get_db as _get_db, get_engine

_bearer = HTTPBearer()

# Module-level engine singleton — one connection pool for the process lifetime
_engine = None


def _get_engine_singleton():
    global _engine
    if _engine is None:
        _engine = get_engine()
    return _engine


def get_db() -> Session:
    yield from _get_db(_get_engine_singleton())


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
) -> dict:
    payload = jwt_service.decode_token(credentials.credentials)
    return jwt_service.get_current_user(payload)


async def require_staff(current_user: dict = Depends(get_current_user)) -> dict:
    jwt_service.require_role(["STAFF", "ADMIN"], current_user)
    return current_user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    jwt_service.require_role(["ADMIN"], current_user)
    return current_user
