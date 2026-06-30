import json
import os
import re
from typing import Optional

from models.schemas import (
    AssistantProfile,
    ChatMessage,
    CallTurn,
    LeadInfo,
)


def _get_genai():
    import google.generativeai as genai

    return genai


def _get_api_key() -> Optional[str]:
    return os.getenv("GEMINI_API_KEY")


def _use_mock() -> bool:
    key = _get_api_key()
    return not key or key.strip() in ("", "your_gemini_api_key_here")


def _extract_json(text: str) -> dict:
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1).strip()
    return json.loads(text)


def _mock_profile_from_description(description: str) -> AssistantProfile:
    desc_lower = description.lower()
    if "saas" in desc_lower or "software" in desc_lower:
        business = "SaaS"
        name = "Alex – SaaS Sales Pro"
    elif "real estate" in desc_lower or "property" in desc_lower:
        business = "Real Estate"
        name = "Jordan – Property Advisor"
    elif "insurance" in desc_lower:
        business = "Insurance"
        name = "Sam – Insurance Specialist"
    else:
        business = "General Sales"
        name = "Riley – Voice Sales Assistant"

    return AssistantProfile(
        name=name,
        business_type=business,
        personality="Warm, confident, and consultative. Listens actively and asks thoughtful follow-up questions.",
        opening_message=f"Hi! This is {name.split('–')[0].strip()} calling from our team. Do you have a quick minute to chat about how we might help you?",
        qualification_questions=[
            "What challenges are you currently facing in this area?",
            "What timeline are you working with for a solution?",
            "What budget range have you allocated for this?",
            "Who else is involved in the decision-making process?",
        ],
        booking_rules="Book a meeting when the lead confirms interest, has budget authority or influence, and agrees to a follow-up within 30 days.",
        call_script=(
            f"1. Introduce yourself as {name}\n"
            "2. Confirm you have the right contact and a moment to talk\n"
            "3. Briefly explain value proposition (1-2 sentences)\n"
            "4. Ask qualification questions one at a time\n"
            "5. Handle objections with empathy\n"
            "6. If qualified, propose a specific meeting time\n"
            "7. Confirm details and thank them"
        ),
    )


def _mock_update_profile(profile: AssistantProfile, update_message: str) -> AssistantProfile:
    updated = profile.model_copy()
    msg = update_message.lower()
    if "friendly" in msg or "casual" in msg:
        updated.personality = "Friendly, upbeat, and conversational. Uses a warm tone while staying professional."
    if "formal" in msg or "professional" in msg:
        updated.personality = "Formal, polished, and authoritative. Speaks with precision and respect."
    if "aggressive" in msg or "persistent" in msg:
        updated.personality = "Direct and persistent. Focuses on urgency and clear next steps."
    if "shorter" in msg or "brief" in msg:
        updated.opening_message = "Hi, quick question — are you open to exploring a solution that could save you time this quarter?"
    if "question" in msg:
        updated.qualification_questions.append("Is there anything specific you'd like to see in a demo?")
    return updated


def _has_booking_intent(msg_lower: str) -> bool:
    booking_phrases = [
        "schedule a meeting",
        "book a meeting",
        "book meeting",
        "set up a meeting",
        "set up a call",
        "let's meet",
        "like to meet",
        "want to meet",
        "schedule a call",
    ]
    if any(phrase in msg_lower for phrase in booking_phrases):
        return True
    if "meeting" in msg_lower and any(w in msg_lower for w in ["schedule", "book", "set up", "want", "like"]):
        return True
    return "available" in msg_lower and any(w in msg_lower for w in ["meet", "call", "time", "schedule"])


def _has_time_preference(msg_lower: str) -> bool:
    time_hints = [
        "monday", "tuesday", "wednesday", "thursday", "friday",
        "tomorrow", "next week", "morning", "afternoon",
        " am", " pm", "2pm", "3pm", "10:", "11:", "1:", "2:", "3:", "4:",
    ]
    return any(hint in msg_lower for hint in time_hints)


def _lead_seems_qualified(history: list[ChatMessage], msg_lower: str) -> bool:
    positive = ["yes", "sure", "interested", "sounds good", "okay", "budget", "timeline", "definitely", "absolutely"]
    if any(w in msg_lower for w in positive):
        return True
    for msg in history:
        if msg.role == "lead" and any(w in msg.content.lower() for w in positive):
            return True
    return _has_booking_intent(msg_lower)


def _mock_call_turn(
    profile: AssistantProfile,
    lead: LeadInfo,
    history: list[ChatMessage],
    user_message: Optional[str],
) -> CallTurn:
    turn_count = len([m for m in history if m.role == "assistant"])

    if turn_count == 0:
        content = profile.opening_message.replace("calling from our team", f"reaching out to {lead.name}")
        return CallTurn(role="assistant", content=content)

    if user_message:
        msg_lower = user_message.lower()
        positive = any(w in msg_lower for w in ["yes", "sure", "interested", "sounds good", "okay", "budget", "timeline"])
        negative = any(w in msg_lower for w in ["no", "not interested", "busy", "stop", "remove"])
        qualified = _lead_seems_qualified(history, msg_lower)
        booking_intent = _has_booking_intent(msg_lower)

        if negative:
            return CallTurn(
                role="assistant",
                content="I completely understand — I appreciate your time. Have a great day!",
                qualified=False,
            )

        if booking_intent and qualified:
            if _has_time_preference(msg_lower):
                return CallTurn(
                    role="assistant",
                    content=(
                        f"Perfect, {lead.name}! I've got you down for that time. "
                        "I'll send a calendar invite shortly. Looking forward to speaking with you!"
                    ),
                    qualified=True,
                    should_book=True,
                )
            return CallTurn(
                role="assistant",
                content=(
                    f"Absolutely, {lead.name}! I'd love to get that on the calendar. "
                    "What day and time work best for a 30-minute meeting this week?"
                ),
                qualified=True,
                should_book=False,
            )

        if booking_intent and turn_count >= 1:
            return CallTurn(
                role="assistant",
                content=(
                    f"Great, {lead.name}! What day and time would work best for a quick meeting?"
                ),
                qualified=True,
                should_book=False,
            )

        if positive and turn_count >= 2:
            return CallTurn(
                role="assistant",
                content=(
                    f"That's great to hear, {lead.name}! Based on what you've shared, I think a 30-minute demo "
                    "would be really valuable. How does Thursday at 2 PM work for you?"
                ),
                qualified=True,
                should_book=True,
            )
        if turn_count == 1:
            q = profile.qualification_questions[0] if profile.qualification_questions else "What's your biggest challenge right now?"
            return CallTurn(role="assistant", content=f"Wonderful! {q}")

        q_idx = min(turn_count - 1, len(profile.qualification_questions) - 1)
        q = profile.qualification_questions[q_idx] if profile.qualification_questions else "What would success look like for you?"
        return CallTurn(role="assistant", content=q)

    return CallTurn(role="assistant", content="Is there anything else I can help clarify?")


async def generate_agent(description: str, messages: list[ChatMessage]) -> AssistantProfile:
    if _use_mock():
        return _mock_profile_from_description(description)

    genai = _get_genai()
    genai.configure(api_key=_get_api_key())
    model = genai.GenerativeModel("gemini-1.5-flash-latest")

    context = "\n".join(f"{m.role}: {m.content}" for m in messages)
    prompt = f"""You are an expert at designing AI voice sales assistants.
Based on the user's description, generate a structured assistant profile as JSON.

User description: {description}

Conversation context:
{context}

Return ONLY valid JSON with these exact fields:
{{
  "name": "assistant display name",
  "business_type": "industry or business type",
  "personality": "personality description",
  "opening_message": "first message on outbound call",
  "qualification_questions": ["question1", "question2", ...],
  "booking_rules": "when to book a meeting",
  "call_script": "step-by-step call script"
}}"""

    response = model.generate_content(prompt)
    data = _extract_json(response.text)
    return AssistantProfile(**data)


async def update_agent(
    profile: AssistantProfile,
    update_message: str,
    messages: list[ChatMessage],
) -> AssistantProfile:
    if _use_mock():
        return _mock_update_profile(profile, update_message)

    genai = _get_genai()
    genai.configure(api_key=_get_api_key())
    model = genai.GenerativeModel("gemini-1.5-flash-latest")

    context = "\n".join(f"{m.role}: {m.content}" for m in messages)
    prompt = f"""Update this AI voice assistant profile based on the user's request.

Current profile:
{profile.model_dump_json(indent=2)}

User update request: {update_message}

Conversation context:
{context}

Return ONLY the updated profile as valid JSON with these exact fields:
{{
  "name": "...",
  "business_type": "...",
  "personality": "...",
  "opening_message": "...",
  "qualification_questions": [...],
  "booking_rules": "...",
  "call_script": "..."
}}"""

    response = model.generate_content(prompt)
    data = _extract_json(response.text)
    return AssistantProfile(**data)


async def simulate_call_turn(
    profile: AssistantProfile,
    lead: LeadInfo,
    history: list[ChatMessage],
    user_message: Optional[str],
) -> CallTurn:
    if _use_mock():
        return _mock_call_turn(profile, lead, history, user_message)

    genai = _get_genai()
    genai.configure(api_key=_get_api_key())
    model = genai.GenerativeModel("gemini-1.5-flash-latest")

    history_text = "\n".join(f"{m.role}: {m.content}" for m in history)
    prompt = f"""You are simulating an outbound sales call as this AI voice assistant.

Assistant profile:
{profile.model_dump_json(indent=2)}

Lead: {lead.name}, Phone: {lead.phone}, Interest: {lead.interest}

Call transcript so far:
{history_text}

Lead's latest message: {user_message or "(call just started — give opening message)"}

Respond as the assistant. Return ONLY valid JSON:
{{
  "role": "assistant",
  "content": "your spoken response",
  "qualified": null or true or false,
  "should_book": true or false
}}

Rules:
- Stay in character per the profile
- Ask one qualification question at a time until the lead is qualified
- If the lead shows booking intent (e.g. schedule a meeting, book a meeting, meet, available) and is qualified, stop asking unrelated qualification questions and either ask for their preferred day/time or confirm a tentative meeting
- Set qualified=true and should_book=true when the lead agrees to a specific meeting time or confirms booking
- Set qualified=false if lead declines
- Keep responses concise (2-3 sentences max, suitable for voice)"""

    response = model.generate_content(prompt)
    data = _extract_json(response.text)
    return CallTurn(**data)
