import { useApp } from '../context/AppContext'
import { Link } from 'react-router-dom'
import '../components/UI.css'

export default function AssistantProfile() {
  const { state } = useApp()
  const profile = state.assistantProfile

  if (!profile) {
    return (
      <div>
        <div className="page-header">
          <h2>Assistant Profile</h2>
          <p>View and review your generated voice assistant configuration.</p>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🤖</div>
            <h3>No assistant yet</h3>
            <p>Create your first voice assistant in the Builder Chat to see its profile here.</p>
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
        <h2>Assistant Profile</h2>
        <p>Structured configuration generated from your chat descriptions.</p>
      </div>

      <div className="card">
        <div className="card-body profile-grid">
          <div className="profile-field">
            <label>Assistant Name</label>
            <div className="value">{profile.name}</div>
          </div>

          <div className="profile-field">
            <label>Business Type</label>
            <div className="value">{profile.business_type}</div>
          </div>

          <div className="profile-field">
            <label>Personality</label>
            <div className="value">{profile.personality}</div>
          </div>

          <div className="profile-field">
            <label>Opening Message</label>
            <div className="value" style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
              "{profile.opening_message}"
            </div>
          </div>

          <div className="profile-field">
            <label>Qualification Questions</label>
            <ul>
              {profile.qualification_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          <div className="profile-field">
            <label>Booking Rules</label>
            <div className="value">{profile.booking_rules}</div>
          </div>

          <div className="profile-field">
            <label>Call Script</label>
            <div className="call-script">{profile.call_script}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
