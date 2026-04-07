from jose import jwt, JWTError, ExpiredSignatureError
from fastapi import HTTPException, status
from app.config.settings import settings


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOKEN_EXPIRED",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="INVALID_TOKEN",
        )


def get_current_user(payload: dict) -> dict:
    return {
        "email": payload.get("sub"),
        "user_id": payload.get("userId"),
        "role": payload.get("role"),
    }


def require_role(required_roles: list[str], user: dict) -> None:
    role = user.get("role")
    if role not in required_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="INSUFFICIENT_ROLE",
        )
