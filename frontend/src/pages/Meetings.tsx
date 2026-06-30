import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fetchMeetings } from '../services/api'
import '../components/UI.css'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function Meetings() {
  const { state, update } = useApp()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMeetings()
      .then((meetings) => {
        const merged = [...meetings]
        for (const local of state.meetings) {
          if (!merged.find((m) => m.id === local.id)) merged.push(local)
        }
        update({ meetings: merged })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const meetings = state.meetings.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div>
      <div className="page-header">
        <h2>Meetings</h2>
        <p>Meetings booked when leads are qualified during call simulations.</p>
      </div>

      <div className="card">
        <div className="card-header">
          Booked Meetings ({meetings.length})
        </div>

        {loading ? (
          <div className="empty-state">
            <span className="loading-spinner dark" />
            <p style={{ marginTop: '0.75rem' }}>Loading meetings...</p>
          </div>
        ) : meetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📅</div>
            <h3>No meetings booked yet</h3>
            <p>
              When a lead is qualified during a call simulation and agrees to meet,
              a meeting will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Lead</th>
                  <th>Phone</th>
                  <th>Meeting Date</th>
                  <th>Notes</th>
                  <th>Booked</th>
                </tr>
              </thead>
              <tbody>
                {meetings.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.lead_name}</td>
                    <td>{m.lead_phone}</td>
                    <td>{formatDate(m.meeting_date)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{m.notes || '—'}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                      {formatDate(m.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
