import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { Lead } from '../types'
import '../components/UI.css'

function generateId() {
  return crypto.randomUUID()
}

const STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  not_qualified: 'Not Qualified',
}

export default function Leads() {
  const { state, update } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [interest, setInterest] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return

    const lead: Lead = {
      id: generateId(),
      name: name.trim(),
      phone: phone.trim(),
      interest: interest.trim() || 'General inquiry',
      status: 'new',
    }

    update({ leads: [...state.leads, lead] })
    setName('')
    setPhone('')
    setInterest('')
  }

  function handleDelete(id: string) {
    update({ leads: state.leads.filter((l) => l.id !== id) })
  }

  return (
    <div>
      <div className="page-header">
        <h2>Leads</h2>
        <p>Add sample leads to test outbound call simulations.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <div className="card-header">Add Lead</div>
        <div className="card-body">
          <form onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Phone</label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Interest</label>
                <input
                  className="form-input"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  placeholder="CRM software"
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Add Lead
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          Lead List ({state.leads.length})
        </div>
        {state.leads.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>No leads yet</h3>
            <p>Add sample leads above to simulate outbound sales calls.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Interest</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {state.leads.map((lead) => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 600 }}>{lead.name}</td>
                    <td>{lead.phone}</td>
                    <td>{lead.interest}</td>
                    <td>
                      <span className={`badge badge-${lead.status}`}>
                        {STATUS_LABELS[lead.status]}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDelete(lead.id)}
                      >
                        Remove
                      </button>
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
