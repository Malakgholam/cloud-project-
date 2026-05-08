require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notifications';
const JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-jwt-secret';
const SERVICE_TOKEN = process.env.SERVICE_TOKEN || 'internal-service-token';

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (notifications database)'))
  .catch(err => console.error('MongoDB connection error:', err));

const NotificationSchema = new mongoose.Schema({
  action:   { type: String, required: true },
  ticketId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  sentAt:   { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);

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

// Internal only: called by other services with service token
app.post('/notify', authenticate, authorize('service'), async (req, res) => {
  try {
    const { action, ticketId, ...metadata } = req.body;
    console.log(`[NOTIFICATION] Action: ${action} | Ticket ID: ${ticketId} | Time: ${new Date().toISOString()}`);
    if (Object.keys(metadata).length > 0) console.log(`  -> Metadata: ${JSON.stringify(metadata)}`);
    const notification = new Notification({ action, ticketId, metadata });
    await notification.save();
    res.json({ success: true, message: 'Notification sent', notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ sentAt: -1 }).limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/notifications/:ticketId', authenticate, authorize('admin'), async (req, res) => {
  try {
    const notifications = await Notification.find({ ticketId: req.params.ticketId }).sort({ sentAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
