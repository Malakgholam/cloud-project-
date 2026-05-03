require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/support';
const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:3001';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (support database)'))
  .catch(err => console.error('MongoDB connection error:', err));

// Models
const AssignmentSchema = new mongoose.Schema({
  ticketId: { type: String, required: true },
  agentId: { type: String, required: true },
  agentName: { type: String, required: true },
  assignedAt: { type: Date, default: Date.now }
});

const ReplySchema = new mongoose.Schema({
  ticketId: { type: String, required: true },
  agent: { type: String, required: true },
  message: { type: String, required: true },
  repliedAt: { type: Date, default: Date.now }
});

const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Reply = mongoose.model('Reply', ReplySchema);

// Helper: send notification
const notify = async (action, ticketId, extra = {}) => {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/notify`, { action, ticketId, ...extra });
  } catch (err) {
    console.error('Notification failed:', err.message);
  }
};

// Assign ticket to agent
app.post('/support/assign', async (req, res) => {
  try {
    const { ticketId, agentId, agentName } = req.body;

    // Update ticket in ticket-service
    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, {
      status: 'in_progress',
      agent: agentName
    });

    const assignment = new Assignment({ ticketId, agentId, agentName });
    await assignment.save();

    await notify('Ticket Assigned', ticketId, { agentName });

    res.status(201).json({ message: 'Ticket assigned successfully', assignment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a reply to a ticket
app.post('/support/reply', async (req, res) => {
  try {
    const { ticketId, agent, message } = req.body;

    const reply = new Reply({ ticketId, agent, message });
    await reply.save();

    // Push reply to ticket-service
    const ticketRes = await axios.get(`${TICKET_SERVICE_URL}/tickets/${ticketId}`);
    const ticket = ticketRes.data;
    const replies = ticket.replies || [];
    replies.push({ agent, message, timestamp: new Date() });

    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, { replies });

    await notify('Reply Added', ticketId);

    res.status(201).json({ message: 'Reply added successfully', reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark ticket as resolved
app.put('/support/resolve/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    await axios.put(`${TICKET_SERVICE_URL}/tickets/${ticketId}`, { status: 'resolved' });

    await notify('Ticket Resolved', ticketId);

    res.json({ message: 'Ticket marked as resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get assignment for a ticket
app.get('/support/assignment/:ticketId', async (req, res) => {
  try {
    const assignment = await Assignment.findOne({ ticketId: req.params.ticketId });
    res.json(assignment || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all replies for a ticket
app.get('/support/replies/:ticketId', async (req, res) => {
  try {
    const replies = await Reply.find({ ticketId: req.params.ticketId });
    res.json(replies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`Support Service running on port ${PORT}`));
