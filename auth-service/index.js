require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(express.json());
app.use(cors());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/auth';
const JWT_SECRET = process.env.JWT_SECRET || 'supportdesk-jwt-secret';

const AGENTS = [
  { id: 'agent_1', username: 'agent1', password: 'agent123', name: 'Malak Mohannad', role: 'agent' },
  { id: 'agent_2', username: 'agent2', password: 'agent234', name: 'Amira Ashraf',     role: 'agent' },
];
const ADMIN = { id: 'admin_1', username: 'admin', password: 'admin123', name: 'Ali Ezzat', role: 'admin' };

mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB (auth database)'))
  .catch(err => console.error('MongoDB connection error:', err));

const CustomerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name:     { type: String, required: true },
  email:    { type: String, default: '' },
  role:     { type: String, default: 'customer' },
  createdAt: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', CustomerSchema);

const issueToken = (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /auth/signup — customer only
app.post('/auth/signup', async (req, res) => {
  try {
    const { username, password, name, email } = req.body;
    if (!username || !password || !name)
      return res.status(400).json({ error: 'username, password, and name are required' });

    if (username === ADMIN.username || AGENTS.some(a => a.username === username))
      return res.status(400).json({ error: 'Username not available' });

    if (await Customer.findOne({ username }))
      return res.status(400).json({ error: 'Username already taken' });

    const hashed = await bcrypt.hash(password, 10);
    await new Customer({ username, password: hashed, name, email: email || '' }).save();
    res.status(201).json({ message: 'Account created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/login — all roles
app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password required' });

    if (username === ADMIN.username) {
      if (password !== ADMIN.password) return res.status(401).json({ error: 'Invalid credentials' });
      const payload = { id: ADMIN.id, username: ADMIN.username, name: ADMIN.name, role: 'admin' };
      return res.json({ token: issueToken(payload), user: payload });
    }

    const agent = AGENTS.find(a => a.username === username);
    if (agent) {
      if (password !== agent.password) return res.status(401).json({ error: 'Invalid credentials' });
      const payload = { id: agent.id, username: agent.username, name: agent.name, role: 'agent' };
      return res.json({ token: issueToken(payload), user: payload });
    }

    const customer = await Customer.findOne({ username });
    if (!customer || !(await bcrypt.compare(password, customer.password)))
      return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { id: customer._id.toString(), username: customer.username, name: customer.name, role: 'customer' };
    return res.json({ token: issueToken(payload), user: payload });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/me — validate token and return payload
app.get('/auth/me', authenticate, (req, res) => {
  res.json(req.user);
});

// GET /auth/agents — agent list for admin's assign dropdown
app.get('/auth/agents', authenticate, (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  res.json(AGENTS.map(a => ({ id: a.id, username: a.username, name: a.name })));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => console.log(`Auth Service running on port ${PORT}`));
