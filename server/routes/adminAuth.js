const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Simple in-memory session tracking for custom dashboard
const activeSessions = new Map();

function generateToken() {
  return Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

const parseCookies = (req) => {
  const list = {};
  const rc = req.headers.cookie;
  rc && rc.split(';').forEach(cookie => {
    const parts = cookie.split('=');
    list[parts.shift().trim()] = decodeURI(parts.join('='));
  });
  return list;
};

// POST /api/admin/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Search database for admin user
    const user = await User.findOne({ email: email.toLowerCase(), role: 'admin' });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate session token
    const token = generateToken();
    activeSessions.set(token, { email, name: user.name, loginAt: new Date() });

    // Set session cookie manually
    res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 4}; SameSite=Lax`);

    return res.json({ success: true, message: 'Login successful.' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/admin/check  — verify if admin is logged in
router.get('/check', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.admin_token;
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
  return res.json({ success: true, admin: activeSessions.get(token) });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  const cookies = parseCookies(req);
  const token = cookies.admin_token;
  if (token) {
    activeSessions.delete(token);
  }
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0');
  return res.json({ success: true, message: 'Logged out.' });
});

module.exports = { router, activeSessions };
