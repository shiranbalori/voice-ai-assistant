from typing import Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str
    content: str


class AssistantProfile(BaseModel):
    name: str = "Sales Assistant"
    business_type: str = "General"
    personality: str = "Professional and friendly"
    opening_message: str = "Hello! How can I help you today?"
    qualification_questions: list[str] = Field(default_factory=list)
    booking_rules: str = "Book a meeting when the lead shows clear interest and budget."
    call_script: str = ""


class GenerateAgentRequest(BaseModel):
    description: str
    messages: list[ChatMessage] = Field(default_factory=list)


class UpdateAgentRequest(BaseModel):
    current_profile: AssistantProfile
    update_message: str
    messages: list[ChatMessage] = Field(default_factory=list)


class LeadInfo(BaseModel):
    id: str
    name: str
    phone: str
    interest: str
    status: str = "new"


class SimulateCallRequest(BaseModel):
    assistant_profile: AssistantProfile
    lead: LeadInfo
    conversation_history: list[ChatMessage] = Field(default_factory=list)
    user_message: Optional[str] = None


class CallTurn(BaseModel):
    role: str
    content: str
    qualified: Optional[bool] = None
    should_book: bool = False


class SimulateCallResponse(BaseModel):
    turn: CallTurn
    transcript: list[ChatMessage]


class BookMeetingRequest(BaseModel):
    lead_id: str
    lead_name: str
    lead_phone: str
    meeting_date: str
    notes: str = ""


class Meeting(BaseModel):
    id: str
    lead_id: str
    lead_name: str
    lead_phone: str
    meeting_date: str
    notes: str = ""
    created_at: str
