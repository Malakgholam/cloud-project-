const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notifications';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (notifications database)'))
  .catch(err => console.error('MongoDB connection error:', err));

// Notification Log Schema
const NotificationSchema = new mongoose.Schema({
  action: { type: String, required: true },
  ticketId: { type: String, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  sentAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', NotificationSchema);

// POST /notify - Receive notification events
app.post('/notify', async (req, res) => {
  try {
    const { action, ticketId, ...metadata } = req.body;

    // In production, this would integrate with email/SMS/push service
    const logMessage = `[NOTIFICATION] Action: ${action} | Ticket ID: ${ticketId} | Time: ${new Date().toISOString()}`;
    console.log(logMessage);
    if (Object.keys(metadata).length > 0) {
      console.log(`  -> Metadata: ${JSON.stringify(metadata)}`);
    }

    const notification = new Notification({ action, ticketId, metadata });
    await notification.save();

    res.json({ success: true, message: 'Notification sent', notification });
  } catch (err) {
    console.error('Notification error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /notifications - Retrieve all notification logs
app.get('/notifications', async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ sentAt: -1 }).limit(100);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /notifications/:ticketId - Retrieve notifications for a specific ticket
app.get('/notifications/:ticketId', async (req, res) => {
  try {
    const notifications = await Notification.find({ ticketId: req.params.ticketId }).sort({ sentAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => console.log(`Notification Service running on port ${PORT}`));
