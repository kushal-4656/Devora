# Devora AI Chatbot

Welcome to **Devora**, a premium, production-ready AI chatbot application featuring dynamic personality modes, real-time SSE streaming, secure authentication, and a modern accessible React frontend.

![Devora AI Banner](https://via.placeholder.com/1200x400.png?text=Devora+AI+-+Intelligent+Assistant)

## 🚀 Features

- **Advanced LLM Integration**: Powered by Google Gemini API via `google-genai` SDK with a custom prompt engineering layer.
- **Dynamic Personalities & Modes**: 
  - **Roles**: Teacher, Friend, Mentor, Developer.
  - **Modes**: Normal, Deep Mode, Exam Mode.
- **Secure Authentication**: Robust email-based login and signup with strong password policies, integrated with Cosmos DB for strict user data isolation.
- **Modern UI/UX**: Built with React (Vite) and Tailwind CSS, featuring glassmorphism elements, smooth framer-motion animations, and responsive design.
- **Real-time Streaming**: Backend powered by FastAPI utilizing Server-Sent Events (SSE) for instantaneous, streaming AI responses.
- **Voice Interaction**: Native Azure Speech SDK integration for high-quality Text-to-Speech (TTS) and Speech-to-Text (STT) capabilities.
- **Accessibility (a11y)**: Screen-reader friendly, comprehensive ARIA roles, keyboard navigation, and focus management.
- **Cloud-Ready**: Includes a multi-stage Dockerfile for seamless deployment to Google Cloud Run.

---

## 🛠️ Technology Stack

### Backend
- **FastAPI**: High-performance Python framework.
- **Azure Cosmos DB**: NoSQL database for secure session and chat history persistence.
- **Azure Speech Services**: For handling voice inputs and audio playback.
- **Google GenAI SDK**: Interfacing with the Gemini models.

### Frontend
- **React 18** (via Vite): Fast, modern frontend framework.
- **Tailwind CSS**: Utility-first CSS framework for rapid, custom styling.
- **Framer Motion**: For fluid, professional micro-animations.
- **React Markdown**: For rendering AI responses with rich text formatting.
- **Microsoft Cognitive Services Speech SDK**: For direct frontend audio streaming when needed.

---

## 📁 Project Structure

```
/
├── main.py              # FastAPI application, auth logic & endpoints
├── chat.py              # Prompt engineering & Gemini API integration
├── db.py                # Database helper functions
├── test_db.py           # Azure CosmosDB connection configuration
├── Dockerfile           # Multi-stage build for Cloud Run deployment
├── requirements.txt     # Python backend dependencies
└── frontend/            # React application source code
    ├── package.json     # NPM dependencies
    ├── vite.config.js   # Vite configuration
    ├── index.html       # HTML entry point
    └── src/
        ├── main.jsx     # React entry point
        ├── App.jsx      # Main application logic & Chat UI
        ├── Login.jsx    # Authentication UI
        └── index.css    # Tailwind CSS & global styles
```

---

## ⚙️ Setup & Installation

### 1. Prerequisites
- **Python 3.9+**
- **Node.js 18+** & NPM
- Access to **Azure Cosmos DB**, **Azure Speech Services**, and **Google Gemini API**.

### 2. Environment Variables
Create a `.env` file in the root directory with the following keys:
```env
# Google Gemini API
chat_api=your_gemini_api_key_here

# Azure Speech Services
azure_speech_key=your_azure_speech_key_here
azure_speech_region=your_azure_speech_region_here

# Azure Cosmos DB (Add connection string if required by test_db.py)
COSMOS_CONNECTION_STRING=your_cosmos_db_connection_string
```

### 3. Backend Setup
1. Create a virtual environment (optional but recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the FastAPI development server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

### 4. Frontend Setup
1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install NPM dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at `http://localhost:5173` and configured to proxy or communicate directly with `http://localhost:8000`.

---

## 🐳 Deployment (Google Cloud Run)

This project includes a multi-stage `Dockerfile` to containerize both the FastAPI backend and the built React frontend into a single deployable image.

1. **Build the container:**
   ```bash
   docker build -t devora-app .
   ```
2. **Deploy to Cloud Run:**
   Push the image to Google Container Registry (GCR) or Artifact Registry, and deploy using the `gcloud run deploy` command, ensuring all environment variables are securely passed.

---

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is licensed under the MIT License.
