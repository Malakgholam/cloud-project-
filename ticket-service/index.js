require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tickets';
const JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-jwt-secret';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'internal-service-token';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (tickets database)'))
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

const TicketSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  customer:    { type: String, required: true },
  customerId:  { type: String, default: null },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  agent:  { type: String, default: null },
  replies: [{
    agent:     String,
    message:   String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', TicketSchema);

const notify = async (action, ticket) => {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
    await axios.post(`${notificationServiceUrl}/notify`, {
      action,
      ticketId: ticket._id,
      status: ticket.status
    }, { headers: { 'x-service-token': SERVICE_TOKEN } });
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
};

app.post('/tickets', authenticate, authorize('customer'), async (req, res) => {
  try {
    const ticket = new Ticket({
      title: req.body.title,
      description: req.body.description,
      customer: req.user.name,
      customerId: req.user.id,
    });
    await ticket.save();
    notify('Ticket Created', ticket);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/tickets', authenticate, async (req, res) => {
  try {
    const query = {};
    if (req.user.role === 'customer') query.customerId = req.user.id;
    else if (req.user.role === 'agent') query.agent = req.user.name;
    // admin and service see all

    const tickets = await Ticket.find(query).sort({ createdAt: -1 });
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tickets/:id', authenticate, async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    if (req.user.role === 'customer' && ticket.customerId !== req.user.id)
      return res.status(403).json({ error: 'Forbidden' });

    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Internal-only: called by support-service with service token
app.put('/tickets/:id', authenticate, authorize('service', 'admin'), async (req, res) => {
  try {
    req.body.updatedAt = Date.now();
    const ticket = await Ticket.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    notify(ticket.status === 'resolved' ? 'Ticket Resolved' : 'Ticket Updated', ticket);
    res.json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Ticket Service running on port ${PORT}`));
