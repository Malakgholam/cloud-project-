import { useState, useEffect, useCallback } from 'react'
import axios from 'axios'

const TICKET_SERVICE = import.meta.env.VITE_TICKET_SERVICE_URL || 'http://localhost:3001'
const SUPPORT_SERVICE = import.meta.env.VITE_SUPPORT_SERVICE_URL || 'http://localhost:3002'
const REPORT_SERVICE = import.meta.env.VITE_REPORT_SERVICE_URL || 'http://localhost:3004'

export default function App() {
  const [activeTab, setActiveTab] = useState('tickets')
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 })
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [filter, setFilter] = useState('all')
  const [report, setReport] = useState(null)
  const [reportLoading, setReportLoading] = useState(false)

  // --- Create Ticket State ---
  const [form, setForm] = useState({ title: '', description: '', customer: '' })
  const [formStatus, setFormStatus] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // --- Modal state ---
  const [assignAgent, setAssignAgent] = useState('')
  const [replyMessage, setReplyMessage] = useState('')
  const [actionStatus, setActionStatus] = useState(null)

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${TICKET_SERVICE}/tickets`)
      const data = res.data
      setTickets(data)
      setStats({
        total: data.length,
        open: data.filter(t => t.status === 'open').length,
        inProgress: data.filter(t => t.status === 'in_progress').length,
        resolved: data.filter(t => t.status === 'resolved').length
      })
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
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

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  useEffect(() => {
    if (activeTab === 'reports') fetchReport()
  }, [activeTab, fetchReport])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.description || !form.customer) {
      setFormStatus({ type: 'error', message: 'All fields are required.' })
      return
    }
    setSubmitting(true)
    setFormStatus(null)
    try {
      await axios.post(`${TICKET_SERVICE}/tickets`, form)
      setFormStatus({ type: 'success', message: '✓ Ticket created successfully!' })
      setForm({ title: '', description: '', customer: '' })
      fetchTickets()
      setTimeout(() => setActiveTab('tickets'), 1500)
    } catch (err) {
      setFormStatus({ type: 'error', message: 'Failed to create ticket. Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async () => {
    if (!assignAgent.trim()) return
    try {
      await axios.post(`${SUPPORT_SERVICE}/support/assign`, {
        ticketId: selectedTicket._id,
        agentId: assignAgent.toLowerCase().replace(' ', '_'),
        agentName: assignAgent
      })
      setActionStatus({ type: 'success', message: 'Ticket assigned successfully!' })
      fetchTickets()
      setAssignAgent('')
    } catch (err) {
      setActionStatus({ type: 'error', message: 'Failed to assign ticket.' })
    }
  }

  const handleReply = async () => {
    if (!replyMessage.trim()) return
    try {
      await axios.post(`${SUPPORT_SERVICE}/support/reply`, {
        ticketId: selectedTicket._id,
        agent: selectedTicket.agent || 'Support Agent',
        message: replyMessage
      })
      setActionStatus({ type: 'success', message: 'Reply added successfully!' })
      setReplyMessage('')
      fetchTickets()
    } catch (err) {
      setActionStatus({ type: 'error', message: 'Failed to add reply.' })
    }
  }

  const handleResolve = async () => {
    try {
      await axios.put(`${SUPPORT_SERVICE}/support/resolve/${selectedTicket._id}`)
      setActionStatus({ type: 'success', message: '✓ Ticket resolved!' })
      fetchTickets()
      setTimeout(() => setSelectedTicket(null), 1500)
    } catch (err) {
      setActionStatus({ type: 'error', message: 'Failed to resolve ticket.' })
    }
  }

  const filteredTickets = filter === 'all' ? tickets : tickets.filter(t => t.status === filter)

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const openModal = (ticket) => {
    setSelectedTicket(ticket)
    setActionStatus(null)
    setAssignAgent('')
    setReplyMessage('')
  }

  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">🎫</div>
          <span>SupportDesk</span>
        </div>
        <div className="navbar-tabs">
          {[
            { id: 'tickets', label: '📋 All Tickets' },
            { id: 'create', label: '➕ New Ticket' },
            { id: 'reports', label: '📊 Reports' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="main-content">
        {/* Mobile Tabs */}
        <div className="filter-bar" style={{ marginBottom: '1.5rem' }}>
          {[{ id: 'tickets', label: '📋 Tickets' }, { id: 'create', label: '➕ New' }, { id: 'reports', label: '📊 Reports' }].map(tab => (
            <button key={tab.id} className={`filter-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)} style={{ display: 'none' }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ===================== TICKETS TAB ===================== */}
        {activeTab === 'tickets' && (
          <>
            <div className="page-header">
              <h1 className="page-title">Support Tickets</h1>
              <p className="page-subtitle">Manage and track all customer support tickets</p>
            </div>

            {/* Stats */}
            <div className="stats-bar">
              <div className="stat-card">
                <div className="stat-label">Total</div>
                <div className="stat-value">{stats.total}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Open</div>
                <div className="stat-value open">{stats.open}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">In Progress</div>
                <div className="stat-value progress">{stats.inProgress}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Resolved</div>
                <div className="stat-value resolved">{stats.resolved}</div>
              </div>
            </div>

            {/* Filter */}
            <div className="filter-bar">
              {['all', 'open', 'in_progress', 'resolved'].map(f => (
                <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              <button className="btn btn-secondary btn-sm" onClick={fetchTickets} style={{ marginLeft: 'auto' }}>
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading"><div className="spinner"></div> Loading tickets...</div>
            ) : filteredTickets.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎫</div>
                <p className="empty-text">No tickets found</p>
                <p className="empty-sub">
                  {filter !== 'all' ? `No ${filter} tickets` : 'Create your first ticket to get started'}
                </p>
              </div>
            ) : (
              <div className="ticket-list">
                {filteredTickets.map((ticket, idx) => (
                  <div key={ticket._id} className="ticket-item" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => openModal(ticket)}>
                    <div className="ticket-header">
                      <div>
                        <div className="ticket-title">{ticket.title}</div>
                        <div className="ticket-meta">
                          <span className="ticket-customer">👤 {ticket.customer}</span>
                          {ticket.agent && <span className="ticket-agent">🧑‍💼 {ticket.agent}</span>}
                          <span className="ticket-date">📅 {formatDate(ticket.createdAt)}</span>
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

        {/* ===================== CREATE TICKET TAB ===================== */}
        {activeTab === 'create' && (
          <>
            <div className="page-header">
              <h1 className="page-title">Create New Ticket</h1>
              <p className="page-subtitle">Submit a new customer support request</p>
            </div>
            <div className="card">
              <h2 className="card-title">🎫 Ticket Details</h2>
              {formStatus && (
                <div className={`alert alert-${formStatus.type}`}>{formStatus.message}</div>
              )}
              <form onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Customer Name</label>
                    <input
                      id="customer-name"
                      className="form-input"
                      type="text"
                      placeholder="John Doe"
                      value={form.customer}
                      onChange={e => setForm({ ...form, customer: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ticket Title</label>
                    <input
                      id="ticket-title"
                      className="form-input"
                      type="text"
                      placeholder="Short summary of the issue"
                      value={form.title}
                      onChange={e => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="form-label">Description</label>
                    <textarea
                      id="ticket-description"
                      className="form-textarea"
                      placeholder="Describe the issue in detail..."
                      value={form.description}
                      onChange={e => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
                  <button id="submit-ticket" type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? '⏳ Submitting...' : '🚀 Submit Ticket'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setForm({ title: '', description: '', customer: '' })}>
                    Clear
                  </button>
                </div>
              </form>
            </div>
          </>
        )}

        {/* ===================== REPORTS TAB ===================== */}
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
                  <h2 className="card-title">📊 Summary Report</h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Generated: {new Date(report.reportGeneratedAt).toLocaleString()}
                  </p>
                  <div className="report-grid">
                    <div className="report-card">
                      <div className="report-number">{report.totalTickets}</div>
                      <div className="report-label">Total Tickets</div>
                    </div>
                    <div className="report-card">
                      <div className="report-number" style={{ fontSize: '1.8rem' }}>{report.averageResponseTimeHours}h</div>
                      <div className="report-label">Avg. Response Time</div>
                    </div>
                    <div className="report-card">
                      <div className="report-number" style={{ color: '#60a5fa', WebkitTextFillColor: '#60a5fa' }}>{report.openTickets}</div>
                      <div className="report-label">Open Tickets</div>
                    </div>
                    <div className="report-card">
                      <div className="report-number" style={{ color: '#fbbf24', WebkitTextFillColor: '#fbbf24' }}>{report.inProgressTickets}</div>
                      <div className="report-label">In Progress</div>
                    </div>
                    <div className="report-card">
                      <div className="report-number" style={{ color: '#34d399', WebkitTextFillColor: '#34d399' }}>{report.resolvedTickets}</div>
                      <div className="report-label">Resolved Tickets</div>
                    </div>
                  </div>
                </div>
                <button className="btn btn-secondary" onClick={fetchReport}>🔄 Refresh Report</button>
              </>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <p className="empty-text">No report data available</p>
                <p className="empty-sub">Create tickets first to generate reports</p>
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={fetchReport}>Retry</button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ===================== TICKET DETAIL MODAL ===================== */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSelectedTicket(null) }}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">{selectedTicket.title}</h2>
              <button className="modal-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            {actionStatus && (
              <div className={`alert alert-${actionStatus.type}`}>{actionStatus.message}</div>
            )}

            <div className="modal-detail-row">
              <span className="modal-detail-label">Status</span>
              <span className={`badge badge-${selectedTicket.status}`}>{selectedTicket.status.replace('_', ' ')}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">Customer</span>
              <span className="modal-detail-value">{selectedTicket.customer}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">Agent</span>
              <span className="modal-detail-value">{selectedTicket.agent || 'Unassigned'}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">Created</span>
              <span className="modal-detail-value">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
            </div>
            <div className="modal-detail-row">
              <span className="modal-detail-label">Description</span>
              <span className="modal-detail-value">{selectedTicket.description}</span>
            </div>

            {/* Replies */}
            {selectedTicket.replies && selectedTicket.replies.length > 0 && (
              <div className="replies-section">
                <div className="replies-title">💬 Replies ({selectedTicket.replies.length})</div>
                {selectedTicket.replies.map((reply, i) => (
                  <div key={i} className="reply-item">
                    <div className="reply-agent">🧑‍💼 {reply.agent}</div>
                    <div className="reply-message">{reply.message}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Actions */}
            {selectedTicket.status !== 'resolved' && (
              <div className="replies-section">
                <div className="replies-title">⚡ Actions</div>
                {!selectedTicket.agent && (
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Agent name"
                      value={assignAgent}
                      onChange={e => setAssignAgent(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm" onClick={handleAssign}>Assign</button>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Write a reply..."
                    value={replyMessage}
                    onChange={e => setReplyMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleReply()}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={handleReply}>Reply</button>
                </div>
              </div>
            )}

            <div className="modal-actions">
              {selectedTicket.status !== 'resolved' && (
                <button className="btn btn-success" onClick={handleResolve}>✓ Mark as Resolved</button>
              )}
              <button className="btn btn-secondary" onClick={() => setSelectedTicket(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
