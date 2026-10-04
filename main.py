import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from config import ALLOWED_ORIGINS
from schemas import (
    ChatRequest,
    AuthRequest,
    ResetPasswordRequest,
    ModeRequest,
    PersonalityRequest,
    TruncateRequest,
    validate_password,
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_session_id,
)
from services import issue_azure_speech_token
from test_db import (
    get_session,
    update_session,
    create_chat,
    get_chat,
    get_all_chats,
    save_message,
    get_chat_history,
    truncate_chat_after,
    create_user,
    get_user_by_email,
    update_user_password,
)
from chat import chat_stream

app = FastAPI(title="Devora Backend API", version="1.0.0")

# Configure CORS for decoupled frontend (Vercel) & local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- System & Health Endpoints ---

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


# --- Session & Preferences Endpoints ---

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


# --- Authentication Endpoints ---

@app.post("/signup")
def signup(req: AuthRequest):
    if not req.is_valid_email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    if not req.is_valid_password:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 digit, and 1 symbol."
        )
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if user:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed = hash_password(req.password)
    create_user(normalized_email, hashed)
    
    token = create_access_token(normalized_email)
    return {"status": "success", "token": token, "email": normalized_email}

@app.post("/login")
def login(req: AuthRequest):
    if not req.is_valid_email:
        raise HTTPException(status_code=400, detail="Invalid email format")
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
        
    token = create_access_token(normalized_email)
    return {"status": "success", "token": token, "email": normalized_email}

@app.post("/reset-password")
def reset_password(req: ResetPasswordRequest):
    if not validate_password(req.new_password):
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 8 characters long, include 1 uppercase, 1 lowercase, 1 digit, and 1 symbol."
        )
    
    normalized_email = req.email.strip().lower()
    user = get_user_by_email(normalized_email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    hashed = hash_password(req.new_password)
    if not update_user_password(normalized_email, hashed):
        raise HTTPException(status_code=500, detail="Failed to update password")
    
    return {"status": "success", "message": "Password updated successfully"}


# --- Chat & History Endpoints ---

@app.get("/chats")
def list_chats(request: Request):
    email = get_session_id(request)
    if email == "default_session":
        return {"chats": []}
    return {"chats": get_all_chats(email)}

@app.get("/chat/{chat_id}")
def load_chat(chat_id: str):
    chat_data = get_chat(chat_id)
    if not chat_data:
        raise HTTPException(status_code=404, detail="Chat not found")
    return {"chat_id": chat_id, **chat_data}

@app.post("/chat")
def chat_endpoint(req: ChatRequest, request: Request):
    session_id = get_session_id(request)
    session = get_session(session_id)
    
    chat_id = req.chat_id
    if not chat_id or not get_chat(chat_id):
        title = req.message[:30] + "..." if len(req.message) > 30 else req.message
        email = session_id if session_id != "default_session" else None
        chat_id = create_chat(title, email)
        
    update_session(session_id, {"current_chat_id": chat_id})
    save_message(chat_id, "user", req.message)
    
    chat_history = get_chat_history(chat_id, turn=20)
    
    email = session_id if session_id != "default_session" else None
    all_chats = get_all_chats(email)
    past_topics = [c["title"] for c in all_chats if c["id"] != chat_id]
    past_topics = past_topics[:10]
    
    personality = session.get("personality", "Friend")
    mode = session.get("mode", "Normal Mode")

    def event_generator():
        full_reply = ""
        try:
            for chunk in chat_stream(chat_history, personality=personality, mode=mode, past_topics=past_topics):
                full_reply += chunk
                yield f"data: {json.dumps({'chunk': chunk, 'chat_id': chat_id})}\n\n"
            
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


# --- Speech Service Endpoints ---

@app.get("/api/speech-token")
def get_speech_token(request: Request):
    return issue_azure_speech_token()


# --- Static Frontend Serving (Production) ---

frontend_dist = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
    
    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        file_path = os.path.join(frontend_dist, catchall)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
