import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { generateAgent, updateAgent } from '../services/api'
import '../components/UI.css'

export default function BuilderChat() {
  const { state, update } = useApp()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasProfile = !!state.assistantProfile

  async function handleSubmit() {
    const text = input.trim()
    if (!text || loading) return

    setError('')
    setLoading(true)

    const userMsg = { role: 'user' as const, content: text }
    const newMessages = [...state.chatMessages, userMsg]
    update({ chatMessages: newMessages })
    setInput('')

    try {
      if (hasProfile && state.assistantProfile) {
        const profile = await updateAgent(state.assistantProfile, text, newMessages)
        update({
          assistantProfile: profile,
          chatMessages: [
            ...newMessages,
            { role: 'assistant', content: `Assistant updated! "${profile.name}" is ready with your changes.` },
          ],
        })
      } else {
        const profile = await generateAgent(text, newMessages)
        update({
          assistantProfile: profile,
          chatMessages: [
            ...newMessages,
            {
              role: 'assistant',
              content: `I've created "${profile.name}" — a ${profile.business_type} voice assistant. Check the Assistant Profile page to review details.`,
            },
          ],
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Builder Chat</h2>
        <p>
          Describe your voice assistant in natural language.{' '}
          {hasProfile ? 'Send updates to refine it.' : 'Start by describing what you need.'}
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card chat-container">
        <div className="chat-messages">
          {state.chatMessages.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">💬</div>
              <h3>Start building your assistant</h3>
              <p>
                Try: "Create a friendly SaaS sales assistant that qualifies leads on budget and timeline,
                then books demo meetings."
              </p>
            </div>
          ) : (
            state.chatMessages.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))
          )}
          {loading && (
            <div className="chat-bubble assistant">
              <span className="loading-spinner dark" /> Thinking...
            </div>
          )}
        </div>

        <div className="chat-input-area">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              hasProfile
                ? 'Describe changes, e.g. "Make the tone more casual"'
                : 'Describe your voice assistant...'
            }
            rows={2}
            disabled={loading}
          />
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading || !input.trim()}>
            {loading ? (
              <span className="loading-spinner" />
            ) : hasProfile ? (
              'Update'
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
