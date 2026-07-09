const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SEVEN_DAYS_SEC = 60 * 60 * 24 * 7; // 604 800 seconds

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

    // Generate a single JWT — used for both the cookie and the response body
    const token = jwt.sign(
      { id: user._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set the JWT as the admin_token cookie (HttpOnly, 7-day Max-Age matching the JWT expiry)
    res.setHeader(
      'Set-Cookie',
      `admin_token=${token}; Path=/; HttpOnly; Max-Age=${SEVEN_DAYS_SEC}; SameSite=Lax`
    );

    return res.json({ success: true, message: 'Login successful.', token });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
});

// GET /api/admin/check  — verify if admin is logged in (stateless JWT check)
router.get('/check', async (req, res) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies.admin_token;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Confirm the user still exists and is still an admin
    const user = await User.findById(decoded.id).select('-password');
    if (!user || user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }

    return res.json({
      success: true,
      admin: { email: user.email, name: user.name, loginAt: null }
    });
  } catch (err) {
    // jwt.verify throws on expired / invalid / tampered tokens
    return res.status(401).json({ success: false, message: 'Not authenticated.' });
  }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
  return res.json({ success: true, message: 'Logged out.' });
});

module.exports = { router };
