require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/support';
const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
const JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-jwt-secret';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'internal-service-token';

const svcHeaders = { headers: { 'x-service-token': SERVICE_TOKEN } };

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (support database)'))
  .catch(err => console.error('MongoDB connection error:', err));

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

const AssignmentSchema = new mongoose.Schema({
  ticketId:   { type: String, required: true },
  agentId:    { type: String, required: true },
  agentName:  { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
});

const ReplySchema = new mongoose.Schema({
  ticketId:  { type: String, required: true },
  agent:     { type: String, required: true },
  message:   { type: String, required: true },
  repliedAt: { type: Date, default: Date.now }
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Reply = mongoose.model('Reply', ReplySchema);

const notify = async (action, ticketId, extra = {}) => {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notify`, { action, ticketId, ...extra }, svcHeaders);
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// Admin only: assign ticket to agent
app.post('/support/assign', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { ticketId, agentId, agentName } = req.body;
    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, { status: 'in_progress', agent: agentName }, svcHeaders);
    const assignment = new Assignment({ ticketId, agentId, agentName });
    await assignment.save();
    await notify('Ticket Assigned', ticketId, { agentName });
    res.status(201).json({ message: 'Ticket assigned successfully', assignment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent or admin: add reply
app.post('/support/reply', authenticate, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { ticketId, message } = req.body;
    const agentName = req.user.name;

    const reply = new Reply({ ticketId, agent: agentName, message });
    await reply.save();

    const ticketRes = await axios.get(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, svcHeaders);
    const replies = [...(ticketRes.data.replies || []), { agent: agentName, message, timestamp: new Date() }];
    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, { replies }, svcHeaders);

    await notify('Reply Added', ticketId);
    res.status(201).json({ message: 'Reply added successfully', reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Agent or admin: resolve ticket
app.put('/support/resolve/:ticketId', authenticate, authorize('agent', 'admin'), async (req, res) => {
  try {
    const { ticketId } = req.params;
    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, { status: 'resolved' }, svcHeaders);
    await notify('Ticket Resolved', ticketId);
    res.json({ message: 'Ticket marked as resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/support/assignment/:ticketId', authenticate, async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ ticketId: req.params.ticketId });
    res.json(assignment || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/support/replies/:ticketId', authenticate, async (req, res) => {
  try {
    const replies = await Reply.find({ ticketId: req.params.ticketId });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Support Service running on port ${PORT}`));
