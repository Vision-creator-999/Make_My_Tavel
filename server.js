require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('⚠️ Could not configure custom DNS servers, using system default.');
}
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const User = require('./server/models/User');
const { generateToken } = require('./server/middleware/auth');

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static website files from the current folder
app.use(express.static(__dirname));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Please set MONGODB_URI in .env file');
  });

/* --- AUTHENTICATION API ROUTES --- */

// 1. Email/Password Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      authProvider: 'credentials',
      verified: false,
      picture: `https://i.pravatar.cc/80?u=${email}`,
      lastLoginAt: new Date()
    });

    const token = generateToken(user._id);
    const userObj = user.toSafeJSON();

    res.status(201).json({ message: 'User registered successfully', user: userObj, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// 2. Email/Password Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
      authProvider: 'credentials'
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);
    const userObj = user.toSafeJSON();

    res.json({ message: 'Login successful', user: userObj, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// 3. Google Sign-Up/Sign-In Capture
app.post('/api/auth/google', async (req, res) => {
  try {
    const { name, email, googleId, picture } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Name and Email are required' });
    }

    let user = await User.findOne({ email: email.toLowerCase() });

    if (user) {
      user.lastLoginAt = new Date();
      if (googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        user.verified = true;
      }
      if (picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        name,
        email: email.toLowerCase(),
        authProvider: 'google',
        verified: true,
        picture: picture || `https://i.pravatar.cc/80?u=${email}`,
        googleId: googleId || 'simulated_google_id',
        lastLoginAt: new Date()
      });
    }

    const token = generateToken(user._id);
    const userObj = user.toSafeJSON();

    res.json({ message: 'Google authentication successful', user: userObj, token });
  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

/* --- ADMIN USER API ROUTES --- */

// 4. Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    // Map _id to id for backward compatibility with admin.html
    const safeUsers = users.map(u => {
      const obj = u.toObject();
      obj.id = obj._id.toString();
      return obj;
    });
    res.json(safeUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 5. Toggle user verification status
app.post('/api/users/verify', async (req, res) => {
  try {
    const { id, verified } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { verified: !!verified },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Verification status updated',
      user: { id: user._id.toString(), name: user.name, verified: user.verified }
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

/* --- HOTEL & BOOKING ROUTES --- */
const hotelRoutes = require('./server/routes/hotelRoutes');
const hotelBookingRoutes = require('./server/routes/hotelBookingRoutes');
const { router: adminAuthRoutes } = require('./server/routes/adminAuth');
const cabRoutes = require('./server/routes/cabRoutes');
const tripBundleRoutes = require('./server/routes/tripBundleRoutes');
const bookingRoutes = require('./server/routes/bookingRoutes');
const profileRoutes = require('./server/routes/profileRoutes');

app.use('/api/hotels', hotelRoutes);
app.use('/api/hotel-bookings', hotelBookingRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/cabs', cabRoutes);
app.use('/api/trip-bundles', tripBundleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);

// Redirect /admin to /admin-login.html
app.get('/admin', (req, res) => {
  res.redirect('/admin-login.html');
});

// Start backend server
app.listen(PORT, () => {
  console.log(`🚀 Make My Travel server running at: http://localhost:${PORT}`);
});
