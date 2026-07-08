const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a JWT token for a user
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

/**
 * Protect routes — verify JWT token and attach user to request
 */
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Fallback: Check cookies for admin_token session
    if (!token && req.headers.cookie) {
      const parseCookies = (cookieStr) => {
        const list = {};
        cookieStr && cookieStr.split(';').forEach(cookie => {
          const parts = cookie.split('=');
          list[parts.shift().trim()] = decodeURI(parts.join('='));
        });
        return list;
      };
      
      const cookies = parseCookies(req.headers.cookie);
      const adminToken = cookies.admin_token;
      
      if (adminToken) {
        const { activeSessions } = require('../routes/adminAuth');
        if (activeSessions && activeSessions.has(adminToken)) {
          const session = activeSessions.get(adminToken);
          req.user = await User.findOne({ email: session.email, role: 'admin' }).select('-password');
          if (req.user) {
            return next();
          }
        }
      }
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, no token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ error: 'User not found' });
    }

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ error: 'Not authorized, invalid token' });
  }
};

/**
 * Admin-only access — must be used after protect middleware
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

module.exports = { protect, adminOnly, generateToken };
