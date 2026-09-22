import uuid
import json
import os
from fastapi import FastAPI, HTTPException, Request, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional

from test_db import get_session, update_session, create_chat, get_chat, get_all_chats, save_message, get_chat_history, truncate_chat_after, create_user, get_user_by_email, update_user_password
from chat import chat_stream
import bcrypt
import jwt
from datetime import datetime, timedelta

from dotenv import load_dotenv

load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "super_secret_production_key_12345")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
try:
    JWT_EXPIRE_DAYS = int(os.getenv("JWT_EXPIRE_DAYS", "7"))
except ValueError:
    JWT_EXPIRE_DAYS = 7

speech_key = os.getenv("azure_speech_key")
speech_region = os.getenv("azure_speech_region")

app = FastAPI(title="Devora Backend API", version="1.0.0")

# Configure CORS for decoupled frontend (Vercel) & local development
raw_origins = os.getenv("ALLOWED_ORIGINS", "")
allowed_origins = [orig.strip() for orig in raw_origins.split(",") if orig.strip()]
if not allowed_origins:
    allowed_origins = ["http://localhost:5173", "http://localhost:3000", "*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    chat_id: Optional[str] = None # If None, creates a new chat

import re
def validate_password(password: str) -> bool:
    if len(password) < 8: return False
    if not re.search(r"[A-Z]", password): return False
    if not re.search(r"[a-z]", password): return False
    if not re.search(r"\d", password): return False
    if not re.search(r"[^A-Za-z0-9]", password): return False
    return True

class AuthRequest(BaseModel):
    email: str
    password: str

    @property
    def is_valid_email(self):
        return re.match(r"^[^@]+@[^@]+\.[^@]+$", self.email) is not None

    @property
    def is_valid_password(self):
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

def get_session_id(request: Request) -> str:
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            sub = payload.get("sub", "default_session")
            if sub != "default_session":
                return sub.strip().lower()
            return sub
        except jwt.ExpiredSignatureError:
            pass
        except jwt.InvalidTokenError:
            pass
    
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        session_id = "default_session"
    return session_id

@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "Devora Backend API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "chat": "/chat"
        }
    }

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/set-mode")
def set_mode(req: ModeRequest, request: Request):
    session_id = get_session_id(request)
    update_session(session_id, {"mode": req.mode})
    return {"status": "success", "mode": req.mode}

@app.post("/set-personality")
def set_personality(req: PersonalityRequest, request: Request):
    session_id = get_session_id(request)
    update_session(session_id, {"personality": req.personality})
    return {"status": "success", "personality": req.personality}

@app.post("/truncate-chat")
def truncate_chat_endpoint(req: TruncateRequest):
    truncate_chat_after(req.chat_id, req.message_id)
    return {"status": "success"}

@app.post("/signup")
def signup(req: AuthRequest):
    if not req.is_valid_email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not req.is_valid_password:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 digit, and 1 symbol.")
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    create_user(normalized_email, hashed)
    
    token = jwt.encode({
        "sub": normalized_email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"status": "success", "token": token, "email": normalized_email}

@app.post("/login")
def login(req: AuthRequest):
    if not req.is_valid_email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not bcrypt.checkpw(req.password.encode('utf-8'), user["password_hash"].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = jwt.encode({
        "sub": normalized_email,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRE_DAYS)
    }, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return {"status": "success", "token": token, "email": normalized_email}

@app.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    if not validate_password(req.new_password):
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 digit, and 1 symbol.")
    
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    hashed = bcrypt.hashpw(req.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if not update_user_password(normalized_email, hashed):
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"status": "success", "message": "Password updated successfully"}

@app.get("/chats")
def list_chats(request: Request):
    email = get_session_id(request)
    if email == "default_session":
        return {"chats": []} # Don't return all chats
    return {"chats": get_all_chats(email)}

@app.get("/chat/{chat_id}")
def load_chat(chat_id: str):
    chat_data = get_chat(chat_id)
    if not chat_data:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"chat_id": chat_id, **chat_data}

@app.get("/api/speech-token")
def get_speech_token(request: Request):
    # Secure token exchange endpoint for frontend JS Speech SDK
    fetch_token_url = f"https://{speech_region}.api.cognitive.microsoft.com/sts/v1.0/issueToken"
    headers = {
        'Ocp-Apim-Subscription-Key': speech_key
    }
    response = requests.post(fetch_token_url, headers=headers)
    
    if response.status_code == 200:
        return {"token": response.text, "region": speech_region}
    else:
        raise HTTPException(status_code=response.status_code, detail="Failed to get speech token")

@app.post("/chat")
def chat_endpoint(req: ChatRequest, request: Request):
    session_id = get_session_id(request)
    session = get_session(session_id)
    
    chat_id = req.chat_id
    if not chat_id or not get_chat(chat_id):
        # Create a new chat if it doesn't exist
        title = req.message[:30] + "..." if len(req.message) > 30 else req.message
        email = session_id if session_id != "default_session" else None
        chat_id = create_chat(title, email)
        
    update_session(session_id, {"current_chat_id": chat_id})
    
    # Save user message
    save_message(chat_id, "user", req.message)
    
    # Get chat history (last 40 messages = 20 turns)
    chat_history = get_chat_history(chat_id, turn=20)
    
    # Get user's past topics for personalization
    email = session_id if session_id != "default_session" else None
    all_chats = get_all_chats(email)
    past_topics = [c["title"] for c in all_chats if c["id"] != chat_id]
    # Keep only the most recent topics
    past_topics = past_topics[:10]
    
    personality = session.get("personality", "Friend")
    mode = session.get("mode", "Normal Mode")

    def event_generator():
        full_reply = ""
        try:
            for chunk in chat_stream(chat_history, personality=personality, mode=mode, past_topics=past_topics):
                full_reply += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'chat_id': chat_id})}\n\n"
            
            # Save assistant message once fully streamed
            save_message(chat_id, "assistant", full_reply)
            yield f"data: {json.dumps({'done': True})}\n\n"
        except Exception as e:
            print(f"Streaming error: {e}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# Serve React frontend
frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))

