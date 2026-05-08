import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const AUTH_SERVICE   = '/api/auth-svc'
const TICKET_SERVICE = '/api/tickets-svc'
const SUPPORT_SERVICE = '/api/support-svc'
const REPORT_SERVICE  = '/api/reports-svc'

const parseJwt = (token) => {
  try { return JSON.parse(atob(token.split('.')[1])) } catch { return null }
}

export default function App() {
  const [user, setUser]         = useState(null)
  const [authView, setAuthView] = useState('login') // 'login' | 'signup'

  // Restore session on mount
  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) return
    const decoded = parseJwt(stored)
    if (decoded && decoded.exp * 1000 > Date.now()) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${stored}`
      setUser(decoded)
    } else {
      localStorage.removeItem('token')
    }
  }, [])

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setAuthView('login')
  }

  if (!user) {
    return authView === 'login'
      ? <LoginPage onLogin={handleLogin} onGoSignup={() => setAuthView('signup')} />
      : <SignupPage onGoLogin={() => setAuthView('login')} />
  }

  return (
    <div className="app-container">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="main-content">
        {user.role === 'customer' && <CustomerApp user={user} />}
        {user.role === 'agent'    && <AgentApp user={user} />}
        {user.role === 'admin'    && <AdminApp user={user} />}
      </main>
    </div>
  )
}

// ─── Auth Pages ────────────────────────────────────────────────────────────────

function LoginPage({ onLogin, onGoSignup }) {
  const [form, setForm]     = useState({ username: '', password: '' })
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await axios.post(`${AUTH_SERVICE}/auth/login`, form)
      onLogin(res.data.user, res.data.token)
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon" style={{ margin: '0 auto 1rem', width: 48, height: 48, fontSize: '1.5rem' }}>🎫</div>
          <h1 className="auth-title">SupportDesk</h1>
          <p className="auth-subtitle">Sign in to your account</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" placeholder="Enter your username"
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Enter your password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-footer">
          New customer?{' '}
          <button className="auth-link" onClick={onGoSignup}>Create an account</button>
        </p>
      </div>
    </div>
  )
}

function SignupPage({ onGoLogin }) {
  const [form, setForm]     = useState({ name: '', username: '', password: '' })
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await axios.post(`${AUTH_SERVICE}/auth/signup`, form)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ fontSize: '3rem', textAlign: 'center' }}>✓</div>
          <h1 className="auth-title">Account Created!</h1>
          <p className="auth-subtitle">You can now sign in with your credentials.</p>
        </div>
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={onGoLogin}>Go to Login</button>
      </div>
    </div>
  )

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="brand-icon" style={{ margin: '0 auto 1rem', width: 48, height: 48, fontSize: '1.5rem' }}>🎫</div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Customer accounts only</p>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" type="text" placeholder="John Doe"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" type="text" placeholder="Choose a username"
              value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Choose a password"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account?{' '}
          <button className="auth-link" onClick={onGoLogin}>Sign in</button>
        </p>
      </div>
    </div>
  )
}

// ─── Shared Navbar ─────────────────────────────────────────────────────────────

const ROLE_LABELS = { customer: 'Customer', agent: 'Agent', admin: 'Admin' }
const ROLE_COLORS = { customer: '#6366f1', agent: '#f59e0b', admin: '#10b981' }

function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand"><span>SupportDesk</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{user.name}</span>
          <span style={{
            background: ROLE_COLORS[user.role],
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 20,
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>{ROLE_LABELS[user.role]}</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  )
}

// ─── Customer App ──────────────────────────────────────────────────────────────

function CustomerApp({ user }) {
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [form, setForm]           = useState({ title: '', description: '' })
  const [formStatus, setFormStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${TICKET_SERVICE}/tickets`)
      setTickets(res.data)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description) {
      setFormStatus({ type: 'error', message: 'All fields are required.' })
      return
    }
    setSubmitting(true)
    setFormStatus(null)
    try {
      await axios.post(`${TICKET_SERVICE}/tickets`, form)
      setFormStatus({ type: 'success', message: '✓ Ticket submitted successfully!' })
      setForm({ title: '', description: '' })
      fetchTickets()
      setTimeout(() => setActiveTab('tickets'), 1500)
    } catch {
      setFormStatus({ type: 'error', message: 'Failed to submit ticket. Try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const tabs = [
    { id: 'tickets', label: 'My Tickets' },
    { id: 'create',  label: 'New Ticket' },
  ]

  return (
    <>
      <div className="navbar-tabs" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <>
          <div className="page-header">
            <h1 className="page-title">My Tickets</h1>
            <p className="page-subtitle">Track your support requests</p>
          </div>
          <div className="filter-bar" style={{ marginBottom: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginLeft: 'auto' }}>Refresh</button>
          </div>
          {loading ? (
            <div className="loading"><div className="spinner"></div> Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <p className="empty-text">No tickets yet</p>
              <p className="empty-sub">Submit a ticket to get help from our team</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setActiveTab('create')}>Create Ticket</button>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.map((ticket, idx) => (
                <div key={ticket._id} className="ticket-item" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => setSelected(ticket)}>
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-title">{ticket.title}</div>
                      <div className="ticket-meta">
                        {ticket.agent && <span className="ticket-agent">Agent: {ticket.agent}</span>}
                        <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status === 'open' ? '🔵' : ticket.status === 'in_progress' ? '🟡' : '🟢'} {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="ticket-desc">{ticket.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'create' && (
        <>
          <div className="page-header">
            <h1 className="page-title">New Ticket</h1>
            <p className="page-subtitle">Describe your issue and we'll get back to you</p>
          </div>
          <div className="card">
            <h2 className="card-title">Ticket Details</h2>
            {formStatus && <div className={`alert alert-${formStatus.type}`}>{formStatus.message}</div>}
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Your Name</label>
              <input className="form-input" type="text" value={user.name} disabled style={{ opacity: 0.6 }} />
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Ticket Title</label>
                <input className="form-input" type="text" placeholder="Short summary of the issue"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" placeholder="Describe the issue in detail..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setForm({ title: '', description: '' })}>Clear</button>
              </div>
            </form>
          </div>
        </>
      )}

      {selected && (
        <TicketModal ticket={selected} role="customer" onClose={() => { setSelected(null); fetchTickets() }} />
      )}
    </>
  )
}

// ─── Agent App ─────────────────────────────────────────────────────────────────

function AgentApp({ user }) {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [selected, setSelected] = useState(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${TICKET_SERVICE}/tickets`)
      setTickets(res.data)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">My Assigned Tickets</h1>
        <p className="page-subtitle">Tickets assigned to you — reply and resolve</p>
      </div>
      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginLeft: 'auto' }}>Refresh</button>
      </div>
      {loading ? (
        <div className="loading"><div className="spinner"></div> Loading...</div>
      ) : tickets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <p className="empty-text">No tickets assigned</p>
          <p className="empty-sub">Tickets assigned to you will appear here</p>
        </div>
      ) : (
        <div className="ticket-list">
          {tickets.map((ticket, idx) => (
            <div key={ticket._id} className="ticket-item" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => setSelected(ticket)}>
              <div className="ticket-header">
                <div>
                  <div className="ticket-title">{ticket.title}</div>
                  <div className="ticket-meta">
                    <span className="ticket-customer">Customer: {ticket.customer}</span>
                    <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>
                <span className={`badge badge-${ticket.status}`}>
                  {ticket.status === 'open' ? '🔵' : ticket.status === 'in_progress' ? '🟡' : '🟢'} {ticket.status.replace('_', ' ')}
                </span>
              </div>
              <p className="ticket-desc">{ticket.description}</p>
            </div>
          ))}
        </div>
      )}
      {selected && (
        <TicketModal ticket={selected} role="agent" onClose={() => { setSelected(null); fetchTickets() }} />
      )}
    </>
  )
}

// ─── Admin App ─────────────────────────────────────────────────────────────────

function AdminApp({ user }) {
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets]     = useState([])
  const [agents, setAgents]       = useState([])
  const [loading, setLoading]     = useState(false)
  const [selected, setSelected]   = useState(null)
  const [report, setReport]       = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${TICKET_SERVICE}/tickets`)
      setTickets(res.data)
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAgents = useCallback(async () => {
    try {
      const res = await axios.get(`${AUTH_SERVICE}/auth/agents`)
      setAgents(res.data)
    } catch (err) {
      console.error('Failed to fetch agents:', err)
    }
  }, [])

  const fetchReport = useCallback(async () => {
    setReportLoading(true)
    try {
      const res = await axios.get(`${REPORT_SERVICE}/reports/summary`)
      setReport(res.data)
    } catch (err) {
      console.error('Failed to fetch report:', err)
    } finally {
      setReportLoading(false)
    }
  }, [])

  useEffect(() => { fetchTickets(); fetchAgents() }, [fetchTickets, fetchAgents])
  useEffect(() => { if (activeTab === 'reports') fetchReport() }, [activeTab, fetchReport])

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    inProgress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
  }

  const tabs = [
    { id: 'tickets', label: 'All Tickets' },
    { id: 'reports', label: 'Reports' },
  ]

  return (
    <>
      <div className="navbar-tabs" style={{ marginBottom: '1.5rem' }}>
        {tabs.map(t => (
          <button key={t.id} className={`nav-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'tickets' && (
        <>
          <div className="page-header">
            <h1 className="page-title">All Tickets</h1>
            <p className="page-subtitle">Assign agents, reply, and resolve tickets</p>
          </div>
          <div className="stats-bar">
            <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total}</div></div>
            <div className="stat-card"><div className="stat-label">Open</div><div className="stat-value open">{stats.open}</div></div>
            <div className="stat-card"><div className="stat-label">In Progress</div><div className="stat-value progress">{stats.inProgress}</div></div>
            <div className="stat-card"><div className="stat-label">Resolved</div><div className="stat-value resolved">{stats.resolved}</div></div>
          </div>
          <div className="filter-bar" style={{ marginBottom: '1rem' }}>
            <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginLeft: 'auto' }}>Refresh</button>
          </div>
          {loading ? (
            <div className="loading"><div className="spinner"></div> Loading...</div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎫</div>
              <p className="empty-text">No tickets yet</p>
            </div>
          ) : (
            <div className="ticket-list">
              {tickets.map((ticket, idx) => (
                <div key={ticket._id} className="ticket-item" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => setSelected(ticket)}>
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-title">{ticket.title}</div>
                      <div className="ticket-meta">
                        <span className="ticket-customer">{ticket.customer}</span>
                        {ticket.agent && <span className="ticket-agent">{ticket.agent}</span>}
                        <span className="ticket-date">{new Date(ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <span className={`badge badge-${ticket.status}`}>
                      {ticket.status === 'open' ? '🔵' : ticket.status === 'in_progress' ? '🟡' : '🟢'} {ticket.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="ticket-desc">{ticket.description}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'reports' && (
        <>
          <div className="page-header">
            <h1 className="page-title">Analytics & Reports</h1>
            <p className="page-subtitle">System-wide ticket metrics and performance data</p>
          </div>
          {reportLoading ? (
            <div className="loading"><div className="spinner"></div> Generating report...</div>
          ) : report ? (
            <>
              <div className="card">
                <h2 className="card-title">Summary Report</h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Generated: {new Date(report.reportGeneratedAt).toLocaleString()}
                </p>
                <div className="report-grid">
                  <div className="report-card"><div className="report-number">{report.totalTickets}</div><div className="report-label">Total Tickets</div></div>
                  <div className="report-card"><div className="report-number" style={{ fontSize: '1.8rem' }}>{report.averageResponseTimeHours}h</div><div className="report-label">Avg. Response Time</div></div>
                  <div className="report-card"><div className="report-number" style={{ color: '#60a5fa', WebkitTextFillColor: '#60a5fa' }}>{report.openTickets}</div><div className="report-label">Open Tickets</div></div>
                  <div className="report-card"><div className="report-number" style={{ color: '#fbbf24', WebkitTextFillColor: '#fbbf24' }}>{report.inProgressTickets}</div><div className="report-label">In Progress</div></div>
                  <div className="report-card"><div className="report-number" style={{ color: '#34d399', WebkitTextFillColor: '#34d399' }}>{report.resolvedTickets}</div><div className="report-label">Resolved Tickets</div></div>
                </div>
              </div>
              <button className="btn btn-secondary" onClick={fetchReport}>Refresh Report</button>
            </>
          ) : (
            <div className="empty-state">
              <p className="empty-text">No report data</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchReport}>Load Report</button>
            </div>
          )}
        </>
      )}

      {selected && (
        <TicketModal ticket={selected} role="admin" agents={agents}
          onClose={() => { setSelected(null); fetchTickets() }} />
      )}
    </>
  )
}

// ─── Shared Ticket Modal ────────────────────────────────────────────────────────

function TicketModal({ ticket: initialTicket, role, agents = [], onClose }) {
  const [ticket, setTicket]       = useState(initialTicket)
  const [assignAgent, setAssignAgent] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [status, setStatus]       = useState(null)
  const [loading, setLoading]     = useState(false)

  const refreshTicket = async () => {
    try {
      const res = await axios.get(`${TICKET_SERVICE}/tickets/${ticket._id}`)
      setTicket(res.data)
    } catch { /* ignore */ }
  }

  const handleAssign = async () => {
    if (!assignAgent) return
    const agent = agents.find(a => a.id === assignAgent)
    if (!agent) return
    setLoading(true)
    try {
      await axios.post(`${SUPPORT_SERVICE}/support/assign`, {
        ticketId: ticket._id,
        agentId: agent.id,
        agentName: agent.name
      })
      setStatus({ type: 'success', message: `Assigned to ${agent.name}` })
      setAssignAgent('')
      await refreshTicket()
    } catch {
      setStatus({ type: 'error', message: 'Failed to assign ticket.' })
    } finally {
      setLoading(false)
    }
  }

  const handleReply = async () => {
    if (!replyMessage.trim()) return
    setLoading(true)
    try {
      await axios.post(`${SUPPORT_SERVICE}/support/reply`, {
        ticketId: ticket._id,
        message: replyMessage
      })
      setStatus({ type: 'success', message: 'Reply added.' })
      setReplyMessage('')
      await refreshTicket()
    } catch {
      setStatus({ type: 'error', message: 'Failed to add reply.' })
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    setLoading(true)
    try {
      await axios.put(`${SUPPORT_SERVICE}/support/resolve/${ticket._id}`)
      setStatus({ type: 'success', message: '✓ Ticket resolved!' })
      await refreshTicket()
      setTimeout(onClose, 1200)
    } catch {
      setStatus({ type: 'error', message: 'Failed to resolve ticket.' })
    } finally {
      setLoading(false)
    }
  }

  const fmt = (d) => new Date(d).toLocaleString()
  const canAct = ticket.status !== 'resolved'

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{ticket.title}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {status && <div className={`alert alert-${status.type}`}>{status.message}</div>}

        <div className="modal-detail-row">
          <span className="modal-detail-label">Status</span>
          <span className={`badge badge-${ticket.status}`}>{ticket.status.replace('_', ' ')}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Customer</span>
          <span className="modal-detail-value">{ticket.customer}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Agent</span>
          <span className="modal-detail-value">{ticket.agent || 'Unassigned'}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Created</span>
          <span className="modal-detail-value">{fmt(ticket.createdAt)}</span>
        </div>
        <div className="modal-detail-row">
          <span className="modal-detail-label">Description</span>
          <span className="modal-detail-value">{ticket.description}</span>
        </div>

        {ticket.replies && ticket.replies.length > 0 && (
          <div className="replies-section">
            <div className="replies-title">Replies ({ticket.replies.length})</div>
            {ticket.replies.map((r, i) => (
              <div key={i} className="reply-item">
                <div className="reply-agent">{r.agent}</div>
                <div className="reply-message">{r.message}</div>
              </div>
            ))}
          </div>
        )}

        {(role === 'agent' || role === 'admin') && canAct && (
          <div className="replies-section">
            <div className="replies-title">Actions</div>

            {role === 'admin' && !ticket.agent && agents.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <select className="form-input" value={assignAgent} onChange={e => setAssignAgent(e.target.value)}
                  style={{ flex: 1 }}>
                  <option value="">Select agent...</option>
                  {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={loading || !assignAgent}>
                  Assign
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input className="form-input" type="text" placeholder="Write a reply..."
                value={replyMessage} onChange={e => setReplyMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReply()} />
              <button className="btn btn-secondary btn-sm" onClick={handleReply} disabled={loading}>Reply</button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          {(role === 'agent' || role === 'admin') && canAct && (
            <button className="btn btn-success" onClick={handleResolve} disabled={loading}>Mark as Resolved</button>
          )}
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
