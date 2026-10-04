from datetime import datetime, timedelta
import bcrypt
import jwt
from fastapi import Request

from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRE_DAYS

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(email: str) -> str:
    """Create a signed JWT access token for an authenticated user."""
    payload = {
        "sub": email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def get_session_id(request: Request) -> str:
    """Extract authenticated user email from Bearer JWT header or fallback to X-Session-ID / default_session."""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            sub = payload.get("sub", "default_session")
            if sub != "default_session":
                return sub.strip().lower()
            return sub
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            pass
    
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        session_id = "default_session"
    return session_id
