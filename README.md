# Voice AI Assistant

A full-stack MVP for creating, editing, and testing AI voice assistants using natural language.

## Features

- **Builder Chat** — Describe your assistant in plain English; get a structured profile
- **Assistant Profile** — Review name, personality, qualification questions, booking rules, and call script
- **Leads** — Add sample leads for testing
- **Call Simulation** — Simulate outbound sales calls with live transcript and browser `speechSynthesis` voice output
- **Meetings** — Auto-book meetings when leads qualify during simulations

## Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18 + Vite + TypeScript        |
| Backend  | FastAPI + Pydantic                  |
| AI       | Google Gemini API (with mock fallback)|
| Voice    | Browser `speechSynthesis`           |
| Storage  | In-memory session state + JSON file (meetings on backend) |

## Quick Start (Local)

### Prerequisites

- Node.js 18+
- Python 3.10+

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # optional: add GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # optional locally — leave VITE_API_BASE_URL unset
npm run dev
```

Open **http://localhost:5173**

Locally, the frontend calls `/api`, which the Vite dev server proxies to `http://127.0.0.1:8001` (see `frontend/vite.config.ts`). Adjust the proxy `target` if your backend runs on a different port.

## Gemini API (Optional)

Copy `backend/.env.example` to `backend/.env` and set:

```
GEMINI_API_KEY=your_key_here
```

Without a valid key, the app runs in **mock mode** with realistic canned responses — perfect for local demos.

## API Endpoints

| Method | Endpoint              | Description                    |
|--------|-----------------------|--------------------------------|
| GET    | `/api/health`         | Health check + mode indicator  |
| POST   | `/api/generate-agent` | Generate assistant from chat   |
| POST   | `/api/update-agent`   | Update existing assistant      |
| POST   | `/api/simulate-call`  | Simulate one call turn         |
| POST   | `/api/book-meeting`   | Book a meeting                 |
| GET    | `/api/meetings`       | List booked meetings           |

---

## Production Deployment

| Service  | Platform | Directory  |
|----------|----------|------------|
| Frontend | Vercel   | `frontend` |
| Backend  | Render   | `backend`  |

### 1. Deploy backend to Render

1. Push this repo to GitHub.
2. In [Render](https://render.com), create a **New Web Service** and connect the repo.
3. Configure the service:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables:

   | Key             | Value                                      |
   |-----------------|--------------------------------------------|
   | `GEMINI_API_KEY`| Your Gemini API key (optional; enables live AI) |
   | `FRONTEND_URL`  | Your Vercel URL, e.g. `https://your-app.vercel.app` |

   `FRONTEND_URL` adds your production frontend to CORS. All `*.vercel.app` preview URLs are also allowed automatically.

5. Deploy and copy the service URL, e.g. `https://voice-ai-assistant-api.onrender.com`.

You can also use the included `backend/render.yaml` blueprint for one-click setup.

**Health check:** `GET https://<your-render-service>.onrender.com/api/health`

### 2. Deploy frontend to Vercel

1. In [Vercel](https://vercel.com), import the same GitHub repo.
2. Configure the project:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Add an environment variable:

   | Key                  | Value                                              |
   |----------------------|----------------------------------------------------|
   | `VITE_API_BASE_URL`  | `https://<your-render-service>.onrender.com/api`   |

   Include the `/api` suffix. Example:
   ```
   VITE_API_BASE_URL=https://voice-ai-assistant-api.onrender.com/api
   ```

4. Deploy. `frontend/vercel.json` handles client-side routing for React Router.

### 3. Wire frontend and backend together

1. Set Render `FRONTEND_URL` to your Vercel production URL.
2. Set Vercel `VITE_API_BASE_URL` to your Render API URL (with `/api`).
3. Redeploy both services after changing environment variables.

### Environment variables reference

**Frontend (Vercel / local)**

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `VITE_API_BASE_URL`   | Production only | Full API base URL, e.g. `https://your-api.onrender.com/api`. Leave unset locally to use the Vite proxy. |

**Backend (Render / local)**

| Variable         | Required | Description |
|------------------|----------|-------------|
| `GEMINI_API_KEY` | No       | Enables live Gemini mode; omit for mock mode |
| `FRONTEND_URL`   | Recommended | Production Vercel URL for CORS |
| `PORT`           | Render only | Set automatically by Render |

### Local vs production API routing

| Environment | `VITE_API_BASE_URL` | How requests reach the backend |
|-------------|---------------------|--------------------------------|
| Local dev   | unset               | Browser → `/api` → Vite proxy → `http://127.0.0.1:8001` |
| Production  | `https://…onrender.com/api` | Browser → Render backend directly |

---

## Architecture Notes

The backend `gemini_service.py` is designed as a swappable AI layer. To integrate real telephony later (Vapi, Twilio, Retell, ElevenLabs), replace the simulation endpoint with provider webhooks while keeping the same assistant profile schema.

Frontend chat and assistant state live in memory only and reset on page reload. Meetings sync to `backend/data/meetings.json`.

## Demo Flow

1. Go to **Builder Chat** → describe: *"Create a friendly SaaS sales assistant"*
2. Review the profile on **Assistant Profile**
3. Add a lead on **Leads**
4. Go to **Call Simulation** → select lead → **Start Call**
5. Reply as the lead → assistant qualifies and books a meeting
6. Check **Meetings** for the booked slot
