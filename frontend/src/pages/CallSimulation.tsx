import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { bookMeeting, simulateCall } from '../services/api'
import type { ChatMessage, Lead, Meeting } from '../types'
import { defaultCallSimulationState } from '../types'
import { isSpeechSupported, speak, stopSpeaking } from '../utils/speech'
import '../components/UI.css'

function tentativeMeetingDate(): Date {
  const meetingDate = new Date()
  meetingDate.setDate(meetingDate.getDate() + 2)
  meetingDate.setHours(14, 0, 0, 0)
  return meetingDate
}

function hasMeetingForLead(meetings: Meeting[], leadId: string): boolean {
  return meetings.some((m) => m.lead_id === leadId)
}

export default function CallSimulation() {
  const { state, update } = useApp()
  const navigate = useNavigate()
  const callSim = state.callSimulation ?? defaultCallSimulationState
  const { selectedLeadId, callActive, transcript, qualificationStatus, voiceEnabled } = callSim

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedLead = state.leads.find((l) => l.id === selectedLeadId) ?? null

  function patchCallSimulation(patch: Partial<typeof callSim>) {
    update((prev) => ({
      callSimulation: { ...prev.callSimulation, ...patch },
    }))
  }

  function updateLeadStatus(leadId: string, status: Lead['status']) {
    update((prev) => ({
      leads: prev.leads.map((l) => (l.id === leadId ? { ...l, status } : l)),
    }))
  }

  async function addMeetingIfNew(lead: Lead, notes: string): Promise<Meeting | null> {
    const existing = state.meetings.find((m) => m.lead_id === lead.id)
    if (existing) return existing

    const meeting = await bookMeeting({
      lead_id: lead.id,
      lead_name: lead.name,
      lead_phone: lead.phone,
      meeting_date: tentativeMeetingDate().toISOString(),
      notes,
    })

    update((prev) => {
      if (hasMeetingForLead(prev.meetings, lead.id)) {
        return {}
      }
      return { meetings: [...prev.meetings, meeting] }
    })

    return meeting
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  useEffect(() => {
    return () => stopSpeaking()
  }, [])

  async function startCall() {
    if (!selectedLead || !state.assistantProfile) return
    setError('')
    setSuccess('')
    setLoading(true)

    patchCallSimulation({
      callActive: true,
      transcript: [],
      qualificationStatus: 'unknown',
    })

    try {
      const result = await simulateCall({
        assistantProfile: state.assistantProfile,
        lead: selectedLead,
        conversationHistory: [],
      })

      patchCallSimulation({ transcript: result.transcript })
      updateLeadStatus(selectedLead.id, 'contacted')
      if (voiceEnabled) speak(result.turn.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start call')
      patchCallSimulation({ callActive: false, transcript: [] })
    } finally {
      setLoading(false)
    }
  }

  async function handleTurnResult(
    lead: Lead,
    turn: { qualified: boolean | null; should_book: boolean; content: string },
    newTranscript: ChatMessage[]
  ) {
    patchCallSimulation({ transcript: newTranscript })

    let qualStatus = qualificationStatus
    if (turn.qualified === true) {
      updateLeadStatus(lead.id, 'qualified')
      qualStatus = 'qualified'
    } else if (turn.qualified === false) {
      updateLeadStatus(lead.id, 'not_qualified')
      qualStatus = 'not_qualified'
    }
    patchCallSimulation({ qualificationStatus: qualStatus })

    if (turn.should_book) {
      const meeting = await addMeetingIfNew(
        lead,
        `Booked during call simulation. Interest: ${lead.interest}`
      )
      if (meeting) {
        setSuccess(`Meeting booked with ${lead.name}. Check the Meetings page for details.`)
      }
    }
  }

  async function sendLeadMessage() {
    const text = input.trim()
    if (!text || !selectedLead || !state.assistantProfile || loading) return

    setError('')
    setSuccess('')
    setLoading(true)
    setInput('')

    try {
      const result = await simulateCall({
        assistantProfile: state.assistantProfile,
        lead: selectedLead,
        conversationHistory: transcript,
        userMessage: text,
      })

      await handleTurnResult(selectedLead, result.turn, result.transcript)
      if (voiceEnabled) speak(result.turn.content)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Call failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleQualified() {
    if (!selectedLead || loading) return

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      updateLeadStatus(selectedLead.id, 'qualified')
      patchCallSimulation({ qualificationStatus: 'qualified' })

      const meeting = await addMeetingIfNew(
        selectedLead,
        `Manually qualified during call simulation. Interest: ${selectedLead.interest}`
      )

      if (meeting) {
        setSuccess(`Meeting booked with ${selectedLead.name}! Redirecting to Meetings...`)
        setTimeout(() => navigate('/meetings'), 1500)
      } else {
        setSuccess(`${selectedLead.name} is already qualified. Check the Meetings page.`)
        setTimeout(() => navigate('/meetings'), 1500)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to qualify lead')
    } finally {
      setLoading(false)
    }
  }

  function handleNotQualified() {
    if (!selectedLead) return
    updateLeadStatus(selectedLead.id, 'not_qualified')
    patchCallSimulation({ qualificationStatus: 'not_qualified' })
    setSuccess('')
    setError('')
  }

  function endCall() {
    stopSpeaking()
    patchCallSimulation({
      callActive: false,
      transcript: [],
      qualificationStatus: 'unknown',
    })
    setInput('')
    setSuccess('')
    setError('')
  }

  function selectLead(leadId: string) {
    if (callActive) return
    patchCallSimulation({
      selectedLeadId: leadId,
      transcript: [],
      qualificationStatus: 'unknown',
    })
    setSuccess('')
    setError('')
  }

  if (!state.assistantProfile) {
    return (
      <div>
        <div className="page-header">
          <h2>Call Simulation</h2>
          <p>Simulate outbound sales calls with your AI assistant.</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📞</div>
            <h3>Create an assistant first</h3>
            <p>Build your voice assistant in Builder Chat before running call simulations.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem', display: 'inline-flex' }}>
              Go to Builder Chat
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h2>Call Simulation</h2>
        <p>Simulate outbound calls — assistant messages are read aloud via browser speech.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="call-layout">
        <div className="card">
          <div className="card-header">Select Lead</div>
          <div className="card-body">
            {state.leads.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem 0' }}>
                <p>No leads available.</p>
                <Link to="/leads" className="btn btn-secondary btn-sm" style={{ marginTop: '0.5rem' }}>
                  Add Leads
                </Link>
              </div>
            ) : (
              state.leads.map((lead) => (
                <div
                  key={lead.id}
                  className={`lead-list-item ${selectedLeadId === lead.id ? 'selected' : ''}`}
                  onClick={() => selectLead(lead.id)}
                >
                  <div className="name">{lead.name}</div>
                  <div className="meta">{lead.phone} · {lead.interest}</div>
                </div>
              ))
            )}

            <div className="call-controls">
              {!callActive ? (
                <button
                  className="btn btn-primary"
                  onClick={startCall}
                  disabled={!selectedLead || loading}
                >
                  {loading ? <span className="loading-spinner" /> : '▶ Start Call'}
                </button>
              ) : (
                <button className="btn btn-danger" onClick={endCall}>
                  End Call
                </button>
              )}
            </div>

            {callActive && selectedLead && (
              <div className="call-controls">
                <button
                  className="btn btn-success btn-sm"
                  onClick={handleQualified}
                  disabled={loading}
                >
                  {loading ? <span className="loading-spinner" /> : '✓ Qualified'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleNotQualified}
                  disabled={loading}
                >
                  ✗ Not Qualified
                </button>
              </div>
            )}

            {callActive && qualificationStatus !== 'unknown' && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                Status: {qualificationStatus === 'qualified' ? 'Qualified' : 'Not Qualified'}
              </p>
            )}

            {isSpeechSupported() && (
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', fontSize: '0.8125rem' }}>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => {
                    patchCallSimulation({ voiceEnabled: e.target.checked })
                    if (!e.target.checked) stopSpeaking()
                  }}
                />
                Voice output (speechSynthesis)
              </label>
            )}
          </div>
        </div>

        <div className="card chat-container" style={{ height: 'auto', minHeight: '500px' }}>
          <div className="card-header">
            Call Transcript
            {callActive && <span style={{ fontWeight: 400, color: 'var(--success)', marginLeft: '0.5rem' }}>● Live</span>}
          </div>
          <div className="chat-messages">
            {transcript.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📞</div>
                <h3>Ready to dial</h3>
                <p>Select a lead and click Start Call to begin the simulation.</p>
              </div>
            ) : (
              transcript.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role === 'assistant' ? 'assistant' : 'lead'}`}>
                  <strong style={{ fontSize: '0.75rem', display: 'block', marginBottom: '0.25rem', opacity: 0.7 }}>
                    {msg.role === 'assistant' ? state.assistantProfile?.name : selectedLead?.name}
                  </strong>
                  {msg.content}
                </div>
              ))
            )}
            {loading && (
              <div className="chat-bubble assistant">
                <span className="loading-spinner dark" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {callActive && (
            <div className="chat-input-area">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendLeadMessage()
                  }
                }}
                placeholder="Type lead's response..."
                rows={2}
                disabled={loading}
              />
              <button
                className="btn btn-primary"
                onClick={sendLeadMessage}
                disabled={loading || !input.trim()}
              >
                Reply
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
