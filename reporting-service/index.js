const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3001';

// GET /reports/summary - Full report
app.get('/reports/summary', async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`);
    const tickets = response.data;

    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;

    // Average response time: diff between createdAt and updatedAt for resolved tickets
    const resolvedTickets = tickets.filter(t => t.status === 'resolved');
    let avgResponseTimeMs = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        return sum + (updated - created);
      }, 0);
      avgResponseTimeMs = totalMs / resolvedTickets.length;
    }

    const avgResponseTimeHours = (avgResponseTimeMs / (1000 * 60 * 60)).toFixed(2);

    res.json({
      totalTickets: total,
      openTickets: open,
      inProgressTickets: inProgress,
      resolvedTickets: resolved,
      averageResponseTimeHours: parseFloat(avgResponseTimeHours),
      reportGeneratedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

// GET /reports/by-status - Open vs Closed breakdown
app.get('/reports/by-status', async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`);
    const tickets = response.data;

    const statusMap = tickets.reduce((acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});

    res.json({ statusBreakdown: statusMap, reportGeneratedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

// GET /reports/by-agent - Tickets per agent
app.get('/reports/by-agent', async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`);
    const tickets = response.data;

    const agentMap = tickets.reduce((acc, ticket) => {
      const agentKey = ticket.agent || 'Unassigned';
      acc[agentKey] = (acc[agentKey] || 0) + 1;
      return acc;
    }, {});

    res.json({ agentBreakdown: agentMap, reportGeneratedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Reporting Service running on port ${PORT}`));
