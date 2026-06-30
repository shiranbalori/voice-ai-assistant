import type {
  AssistantProfile,
  CallTurn,
  ChatMessage,
  Lead,
  Meeting,
} from '../types'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const REQUEST_TIMEOUT_MS = 120_000

function parseAssistantProfile(json: unknown): AssistantProfile {
  console.log('[api] parsed JSON for assistant profile:', json)

  const root = json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  const source =
    root?.profile ??
    root?.assistant_profile ??
    root?.assistantProfile ??
    root?.data ??
    json

  if (!source || typeof source !== 'object') {
    throw new Error('Invalid assistant profile response shape')
  }

  const p = source as Record<string, unknown>
  const profile: AssistantProfile = {
    name: String(p.name ?? 'Sales Assistant'),
    business_type: String(p.business_type ?? p.businessType ?? 'General'),
    personality: String(p.personality ?? 'Professional and friendly'),
    opening_message: String(
      p.opening_message ?? p.openingMessage ?? 'Hello! How can I help you today?'
    ),
    qualification_questions: Array.isArray(p.qualification_questions)
      ? p.qualification_questions.map(String)
      : Array.isArray(p.qualificationQuestions)
        ? p.qualificationQuestions.map(String)
        : [],
    booking_rules: String(
      p.booking_rules ?? p.bookingRules ?? 'Book a meeting when the lead shows clear interest.'
    ),
    call_script: String(p.call_script ?? p.callScript ?? ''),
  }

  console.log('[api] normalized assistantProfile.name:', profile.name)
  return profile
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      signal: controller.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }

  const rawText = await res.text()
  console.log('[api] raw fetch response', { path, status: res.status, url, body: rawText })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const errJson = rawText ? JSON.parse(rawText) : null
      if (errJson && typeof errJson === 'object' && 'detail' in errJson) {
        detail = String((errJson as { detail: unknown }).detail)
      }
    } catch {
      detail = rawText || detail
    }
    throw new Error(detail || 'Request failed')
  }

  let json: unknown = null
  if (rawText) {
    try {
      json = JSON.parse(rawText)
    } catch {
      throw new Error(`Invalid JSON response from ${path}`)
    }
  }

  console.log('[api] parsed JSON', { path, json })
  return json as T
}

export async function checkHealth(): Promise<{ status: string; mode: string; gemini_configured: boolean }> {
  return request('/health')
}

export async function generateAgent(
  description: string,
  messages: ChatMessage[]
): Promise<AssistantProfile> {
  const json = await request<unknown>('/generate-agent', {
    method: 'POST',
    body: JSON.stringify({ description, messages }),
  })
  return parseAssistantProfile(json)
}

export async function updateAgent(
  currentProfile: AssistantProfile,
  updateMessage: string,
  messages: ChatMessage[]
): Promise<AssistantProfile> {
  const json = await request<unknown>('/update-agent', {
    method: 'POST',
    body: JSON.stringify({
      current_profile: currentProfile,
      update_message: updateMessage,
      messages,
    }),
  })
  return parseAssistantProfile(json)
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
