require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3001';
const JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-jwt-secret';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'internal-service-token';

const svcHeaders = { headers: { 'x-service-token': SERVICE_TOKEN } };

const authenticate = (req, res, next) => {
  if (req.headers['x-service-token'] === SERVICE_TOKEN) {
    req.user = { role: 'service' };
    return next();
  }
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Forbidden' });

app.get('/reports/summary', authenticate, authorize('admin'), async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`, svcHeaders);
    const tickets = response.data;

    const total = tickets.length;
    const open = tickets.filter(t => t.status === 'open').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved').length;

    const resolvedTickets = tickets.filter(t => t.status === 'resolved');
    let avgResponseTimeMs = 0;
    if (resolvedTickets.length > 0) {
      const totalMs = resolvedTickets.reduce((sum, t) => {
        return sum + (new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime());
      }, 0);
      avgResponseTimeMs = totalMs / resolvedTickets.length;
    }

    res.json({
      totalTickets: total,
      openTickets: open,
      inProgressTickets: inProgress,
      resolvedTickets: resolved,
      averageResponseTimeHours: parseFloat((avgResponseTimeMs / 3600000).toFixed(2)),
      reportGeneratedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

app.get('/reports/by-status', authenticate, authorize('admin'), async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`, svcHeaders);
    const statusMap = response.data.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    res.json({ statusBreakdown: statusMap, reportGeneratedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

app.get('/reports/by-agent', authenticate, authorize('admin'), async (req, res) => {
  try {
    const response = await axios.get(`${TICKET_SERVICE_URL}/tickets`, svcHeaders);
    const agentMap = response.data.reduce((acc, t) => {
      const key = t.agent || 'Unassigned';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    res.json({ agentBreakdown: agentMap, reportGeneratedAt: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate report', details: err.message });
  }
});

const PORT = process.env.PORT || 3004;
app.listen(PORT, () => console.log(`Reporting Service running on port ${PORT}`));
