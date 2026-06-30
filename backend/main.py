import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    AssistantProfile,
    BookMeetingRequest,
    ChatMessage,
    GenerateAgentRequest,
    Meeting,
    SimulateCallRequest,
    SimulateCallResponse,
    UpdateAgentRequest,
)

load_dotenv()

app = FastAPI(title="Voice AI Assistant API", version="1.0.0")

_cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
_frontend_url = os.getenv("FRONTEND_URL", "").strip().rstrip("/")
if _frontend_url:
    _cors_origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

DATA_DIR = Path(__file__).parent / "data"
MEETINGS_FILE = DATA_DIR / "meetings.json"


def _load_meetings() -> list[dict]:
    DATA_DIR.mkdir(exist_ok=True)
    if not MEETINGS_FILE.exists():
        return []
    with open(MEETINGS_FILE, encoding="utf-8") as f:
        return json.load(f)


def _save_meetings(meetings: list[dict]) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    with open(MEETINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(meetings, f, indent=2)


@router.get("/health")
async def health():
    gemini_configured = bool(
        os.getenv("GEMINI_API_KEY")
        and os.getenv("GEMINI_API_KEY").strip() not in ("", "your_gemini_api_key_here")
    )
    return {
        "status": "ok",
        "gemini_configured": gemini_configured,
        "mode": "live" if gemini_configured else "mock",
    }


@router.post("/generate-agent", response_model=AssistantProfile)
async def api_generate_agent(req: GenerateAgentRequest):
    from services.gemini_service import generate_agent

    if not req.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
    try:
        return await generate_agent(req.description, req.messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate agent: {e}")


@router.post("/update-agent", response_model=AssistantProfile)
async def api_update_agent(req: UpdateAgentRequest):
    from services.gemini_service import update_agent

    if not req.update_message.strip():
        raise HTTPException(status_code=400, detail="Update message is required")
    try:
        return await update_agent(req.current_profile, req.update_message, req.messages)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agent: {e}")


@router.post("/simulate-call", response_model=SimulateCallResponse)
async def api_simulate_call(req: SimulateCallRequest):
    from services.gemini_service import simulate_call_turn

    try:
        turn = await simulate_call_turn(
            req.assistant_profile,
            req.lead,
            req.conversation_history,
            req.user_message,
        )

        transcript = list(req.conversation_history)
        if req.user_message:
            transcript.append(ChatMessage(role="lead", content=req.user_message))
        transcript.append(ChatMessage(role="assistant", content=turn.content))

        return SimulateCallResponse(turn=turn, transcript=transcript)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Call simulation failed: {e}")


@router.post("/book-meeting", response_model=Meeting)
async def api_book_meeting(req: BookMeetingRequest):
    meetings = _load_meetings()
    meeting = Meeting(
        id=str(uuid.uuid4()),
        lead_id=req.lead_id,
        lead_name=req.lead_name,
        lead_phone=req.lead_phone,
        meeting_date=req.meeting_date,
        notes=req.notes,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    meetings.append(meeting.model_dump())
    _save_meetings(meetings)
    return meeting


@router.get("/meetings", response_model=list[Meeting])
async def api_get_meetings():
    return [Meeting(**m) for m in _load_meetings()]


app.include_router(router, prefix="/api")
