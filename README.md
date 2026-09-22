# 🌟 Devora AI Chatbot

A modern, production-oriented conversational AI platform featuring real-time streaming, Azure-powered voice interaction, dynamic personality modes, and persistent cloud storage.

---

## ✨ Features

- **⚡ Real-Time Streaming**: Low-latency responses powered by Server-Sent Events (SSE).
- **🎙️ Speech-to-Text & Voice Feedback**: Interruption-free Azure Speech synthesis and microphone input.
- **🎭 Adaptive Personalities**: Switch effortlessly between **Teacher**, **Mentor**, and **Friend** tones.
- **🧠 Flexible Modes**: Tailor output depths using **Normal**, **Deep**, and **Exam** modes.
- **🔒 Secure Authentication**: Robust JWT-based auth with salted password hashing.
- **☁️ Cloud Persistence**: Conversation histories and user sessions backed by **Azure Cosmos DB**.
- **🎨 Glassmorphic UI**: Responsive design built with React, Vite, Tailwind CSS, and Framer Motion.

---

## 🏗️ Architecture Overview

Devora is built with a decoupled architecture optimized for cloud deployment:

```text
┌───────────────────────────┐         REST / SSE Stream        ┌───────────────────────────┐
│     Vercel (Frontend)     │ ───────────────────────────────> │  Render (Docker Backend)  │
│  https://<app>.vercel.app │ <─────────────────────────────── │ https://<app>.onrender.com│
└───────────────────────────┘       CORS & Bearer Auth         └───────────────────────────┘
                                                                             │
                                                                 ┌───────────┴───────────┐
                                                                 │  Azure Cosmos DB      │
                                                                 │  Azure Speech Service │
                                                                 │  Google Gemini API    │
                                                                 └───────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn, Docker |
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide Icons |
| **AI & Speech** | Google GenAI SDK (Gemini), Microsoft Cognitive Services Speech SDK |
| **Database** | Azure Cosmos DB (NoSQL API) |
| **Hosting** | Render (Dockerized Web Service), Vercel (SPA Frontend) |

---

## 📂 Project Structure

```text
chatbought/
├── Dockerfile              # Production multi-stage Dockerfile for backend
├── render.yaml             # Render Blueprint for automated backend deployment
├── requirements.txt        # Python backend dependencies
├── main.py                 # FastAPI application, auth routes, and API endpoints
├── chat.py                 # Gemini prompt engineering and SSE streaming logic
├── speech.js               # Standalone Azure Speech synthesis & playback helper
├── test_db.py              # Cosmos DB connection and health check utility
├── vercel.json             # Root Vercel SPA routing fallback
├── .env.example            # Backend environment variables template
└── frontend/               # React client application
    ├── src/
    │   ├── App.jsx         # Chat interface, streaming handler, and state
    │   ├── Landing.jsx     # Product landing page
    │   ├── Login.jsx       # User login component
    │   ├── Signup.jsx      # User registration component
    │   ├── ForgotPassword.jsx # Password reset component
    │   ├── config.js       # Centralized API_BASE configuration
    │   └── speech.js       # Client-side Azure Speech helper (no interruptions)
    ├── package.json        # NPM dependencies and scripts
    ├── vite.config.js      # Vite configuration
    ├── vercel.json         # Frontend SPA rewrite rules
    └── .env.example        # Frontend environment variables template
```

---

## ⚙️ Environment Variables

### 1. Backend (`.env`)

Create a `.env` file in the root directory:

| Variable | Description | Example / Default |
|---|---|---|
| `PORT` | Service port | `8000` |
| `chat_api` | Google Gemini API Key | `AIzaSy...` |
| `azure_speech_key` | Azure Cognitive Speech API Key | `<your-speech-key>` |
| `azure_speech_region` | Azure Speech Region | `centralindia` |
| `azure_cosmos_uri` | Azure Cosmos DB URI | `https://<account>.documents.azure.com:443/` |
| `azure_cosmos_key` | Azure Cosmos DB Primary Key | `<your-cosmos-key>` |
| `JWT_SECRET` | Secret key for signing JWT tokens | 64+ char random hex string |
| `JWT_ALGORITHM` | Token signing algorithm | `HS256` |
| `JWT_EXPIRE_DAYS` | Token lifespan | `7` |
| `ALLOWED_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5173,https://your-app.vercel.app` |

### 2. Frontend (`frontend/.env`)

Create a `.env` file inside the `frontend/` folder:

| Variable | Description | Value |
|---|---|---|
| `VITE_API_BASE` | URL of your deployed Render backend | `https://devora-latest.onrender.com` |

---

## 🚀 Deployment

### Step 1: Deploy Backend to Render

1. Push your repository to GitHub.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** → **Web Service**.
3. Select your GitHub repository (`Devora`).
4. Select **Docker** as the Runtime (Render automatically detects the root `Dockerfile`).
5. In the **Environment Variables** tab, add the backend variables listed above.
6. Click **Create Web Service**.

> [!TIP]
> Once deployed, your backend will be live at `https://<your-service>.onrender.com`. Verify health at `/health`.

---

### Step 2: Deploy Frontend to Vercel

1. In the [Vercel Dashboard](https://vercel.com/dashboard), click **Add New...** → **Project**.
2. Import your GitHub repository.
3. Configure the build settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the Environment Variable:
   - **`VITE_API_BASE`**: `https://devora-latest.onrender.com`
5. Click **Deploy**.

> [!NOTE]
> Single-page routing rewrites are pre-configured in `frontend/vercel.json` to prevent 404 errors on browser refresh.

---

## 💻 Local Development

### Run Backend

```bash
# In the repository root
python -m venv venv
venv\Scripts\activate      # Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend will be accessible at: `http://localhost:8000` (Health Check: `http://localhost:8000/health`)

### Run Frontend

```bash
cd frontend
npm install
npm run dev
```
Frontend will be accessible at: `http://localhost:5173`

---

## 🔌 API Reference

| Endpoint | Method | Description | Auth Required |
|---|---|---|:---:|
| `/health` | `GET` | Service status and liveness probe | No |
| `/signup` | `POST` | Register a new user | No |
| `/login` | `POST` | Authenticate user & issue JWT token | No |
| `/reset-password` | `POST` | Reset user account password | No |
| `/chats` | `GET` | Fetch user's conversation sessions | Yes |
| `/chat/{chat_id}` | `GET` | Fetch specific conversation history | Yes |
| `/chat` | `POST` | Send message (SSE streaming response) | Yes |
| `/set-personality`| `POST` | Set persona (`Teacher`, `Mentor`, `Friend`) | Yes |
| `/set-mode` | `POST` | Set response mode (`Exam`, `Deep`, `Normal`) | Yes |
| `/api/speech-token`| `GET` | Issue short-lived Azure Speech token | Yes |

---

## 📝 License

Distributed under the [MIT License](LICENSE).
