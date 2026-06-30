import type {
  AssistantProfile,
  CallTurn,
  ChatMessage,
  Lead,
  Meeting,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export async function checkHealth(): Promise<{ status: string; mode: string; gemini_configured: boolean }> {
  return request('/health')
}

export async function generateAgent(
  description: string,
  messages: ChatMessage[]
): Promise<AssistantProfile> {
  return request('/generate-agent', {
    method: 'POST',
    body: JSON.stringify({ description, messages }),
  })
}

export async function updateAgent(
  currentProfile: AssistantProfile,
  updateMessage: string,
  messages: ChatMessage[]
): Promise<AssistantProfile> {
  return request('/update-agent', {
    method: 'POST',
    body: JSON.stringify({
      current_profile: currentProfile,
      update_message: updateMessage,
      messages,
    }),
  })
}

export async function simulateCall(params: {
  assistantProfile: AssistantProfile
  lead: Lead
  conversationHistory: ChatMessage[]
  userMessage?: string
}): Promise<{ turn: CallTurn; transcript: ChatMessage[] }> {
  return request('/simulate-call', {
    method: 'POST',
    body: JSON.stringify({
      assistant_profile: params.assistantProfile,
      lead: params.lead,
      conversation_history: params.conversationHistory,
      user_message: params.userMessage ?? null,
    }),
  })
}

export async function bookMeeting(data: {
  lead_id: string
  lead_name: string
  lead_phone: string
  meeting_date: string
  notes?: string
}): Promise<Meeting> {
  return request('/book-meeting', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function fetchMeetings(): Promise<Meeting[]> {
  return request('/meetings')
}
