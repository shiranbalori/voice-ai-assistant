import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { checkHealth } from '../services/api'
import './Layout.css'

const NAV_ITEMS = [
  { to: '/', label: 'Builder Chat', icon: '💬' },
  { to: '/profile', label: 'Assistant Profile', icon: '🤖' },
  { to: '/leads', label: 'Leads', icon: '👥' },
  { to: '/call', label: 'Call Simulation', icon: '📞' },
  { to: '/meetings', label: 'Meetings', icon: '📅' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [apiMode, setApiMode] = useState<'live' | 'mock'>('mock')

  useEffect(() => {
    checkHealth()
      .then((h) => setApiMode(h.mode as 'live' | 'mock'))
      .catch(() => setApiMode('mock'))
  }, [])

  return (
    <div className="app-layout">
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="logo-icon">🎙️</div>
            <div className="logo-text">
              <h1>Voice AI</h1>
              <span>Assistant Platform</span>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className={`mode-badge ${apiMode}`}>
            <span className="mode-dot" />
            {apiMode === 'live' ? 'Gemini Live' : 'Mock Mode'}
          </span>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            ☰
          </button>
          <div className="sidebar-logo">
            <div className="logo-icon">🎙️</div>
            <div className="logo-text">
              <h1>Voice AI</h1>
            </div>
          </div>
          <span className={`mode-badge ${apiMode}`}>
            <span className="mode-dot" />
            {apiMode === 'live' ? 'Live' : 'Mock'}
          </span>
        </header>
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
