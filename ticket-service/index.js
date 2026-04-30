const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tickets';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (tickets database)'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const TicketSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  customer: { type: String, required: true },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  agent: { type: String, default: null },
  replies: [{
    agent: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', TicketSchema);

// Helper function to notify
const notify = async (action, ticket) => {
  try {
    const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';
    await axios.post(`${notificationServiceUrl}/notify`, {
      action,
      ticketId: ticket._id,
      status: ticket.status
    });
  } catch (error) {
    console.error('Failed to send notification:', error.message);
  }
};

// Routes
app.post('/tickets', async (req, res) => {
  try {
    const ticket = new Ticket(req.body);
    await ticket.save();
    notify('Ticket Created', ticket);
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/tickets', async (req, res) => {
  try {
    const tickets = await Ticket.find();
    res.json(tickets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/tickets/:id', async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/tickets/:id', async (req, res) => {
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
