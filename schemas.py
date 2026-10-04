import re
from typing import Optional
from pydantic import BaseModel

def validate_password(password: str) -> bool:
    """Password validation: minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 digit, and 1 special char."""
    if len(password) < 8:
        return False
    if not re.search(r"[A-Z]", password):
        return False
    if not re.search(r"[a-z]", password):
        return False
    if not re.search(r"\d", password):
        return False
    if not re.search(r"[^A-Za-z0-9]", password):
        return False
    return True

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None  # If None, creates a new chat

class AuthRequest(BaseModel):
    email: str
    password: str

    @property
    def is_valid_email(self) -> bool:
        return re.match(r"^[^@]+@[^@]+\.[^@]+$", self.email) is not None

    @property
    def is_valid_password(self) -> bool:
        return validate_password(self.password)

class ResetPasswordRequest(BaseModel):
    email: str
    new_password: str

class ModeRequest(BaseModel):
    mode: str

class PersonalityRequest(BaseModel):
    personality: str

class SpeakRequest(BaseModel):
    text: str

class TruncateRequest(BaseModel):
    message_id: str
    chat_id: str
