export interface ChatMessage {
  role: 'user' | 'assistant' | 'lead' | 'system'
  content: string
}

export interface AssistantProfile {
  name: string
  business_type: string
  personality: string
  opening_message: string
  qualification_questions: string[]
  booking_rules: string
  call_script: string
}

export interface Lead {
  id: string
  name: string
  phone: string
  interest: string
  status: 'new' | 'contacted' | 'qualified' | 'not_qualified'
}

export interface Meeting {
  id: string
  lead_id: string
  lead_name: string
  lead_phone: string
  meeting_date: string
  notes: string
  created_at: string
}

export interface CallTurn {
  role: string
  content: string
  qualified: boolean | null
  should_book: boolean
}

export interface CallSimulationState {
  selectedLeadId: string | null
  callActive: boolean
  transcript: ChatMessage[]
  qualificationStatus: 'unknown' | 'qualified' | 'not_qualified'
  voiceEnabled: boolean
}

export interface AppState {
  chatMessages: ChatMessage[]
  assistantProfile: AssistantProfile | null
  leads: Lead[]
  meetings: Meeting[]
  callSimulation: CallSimulationState
}

export const STORAGE_KEY = 'voice-ai-assistant-state'

export const defaultCallSimulationState: CallSimulationState = {
  selectedLeadId: null,
  callActive: false,
  transcript: [],
  qualificationStatus: 'unknown',
  voiceEnabled: true,
}

export const defaultState: AppState = {
  chatMessages: [],
  assistantProfile: null,
  leads: [],
  meetings: [],
  callSimulation: defaultCallSimulationState,
}
