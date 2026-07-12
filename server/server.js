require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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
const User = require('./models/User');
const Subscriber = require('./models/Subscriber');
const ContactMessage = require('./models/ContactMessage');
const { generateToken, protect, adminOnly } = require('./middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('netlify.app')) {
      return callback(null, true);
    }
    return callback(new Error('CORS Policy: Origin not allowed'), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static website files from the frontend folder
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas');
  })
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

// 3. Google Sign-Up/Sign-In verification
app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    // Verify token against Google's OAuth2 servers
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || payload.email.split('@')[0];
    const googleId = payload.sub;
    const picture = payload.picture || '';

    let user = await User.findOne({ email });

    if (user) {
      user.lastLoginAt = new Date();
      user.googleId = googleId;
      user.authProvider = 'google';
      user.verified = true;
      if (picture && !user.picture) user.picture = picture;
      await user.save();
    } else {
      user = await User.create({
        name,
        email,
        authProvider: 'google',
        verified: true,
        picture: picture || `https://i.pravatar.cc/80?u=${email}`,
        googleId,
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
      obj.id = obj._id ? obj._id.toString() : (obj.id || '').toString();
      if (!obj._id) obj._id = obj.id;
      return obj;
    });
    res.json(safeUsers);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// 4a. Get user registration and booking stats (Admin only)
app.get('/api/users/stats', protect, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const googleUsers = await User.countDocuments({ authProvider: 'google' });
    const verifiedUsers = await User.countDocuments({ verified: true });
    
    // Registrations by month (current year)
    const currentYear = new Date().getFullYear();
    const monthlyRegistrations = await User.aggregate([
      {
        $match: {
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const registrationsByMonth = months.map((month, i) => {
      const found = monthlyRegistrations.find(m => m._id === i + 1);
      return { month, count: found ? found.count : 0 };
    });

    // Top active users by spend
    const HotelBooking = require('./models/HotelBooking');
    const Booking = require('./models/Booking');

    const hb = await HotelBooking.find().lean();
    const ob = await Booking.find().lean();

    const userSpend = {};
    [...hb, ...ob].forEach(b => {
      const uId = b.user ? b.user.toString() : 'guest';
      if (!userSpend[uId]) {
        userSpend[uId] = { bookings: 0, spend: 0 };
      }
      userSpend[uId].bookings += 1;
      userSpend[uId].spend += (b.totalAmount || b.amount || 0);
    });

    const userIds = Object.keys(userSpend).filter(id => id !== 'guest');
    const dbUsers = await User.find({ _id: { $in: userIds } }).select('name email picture').lean();
    const userMap = {};
    dbUsers.forEach(u => {
      userMap[u._id.toString()] = u;
    });

    const topUsers = Object.entries(userSpend)
      .map(([id, stats]) => {
        const u = userMap[id];
        return {
          id,
          name: u ? u.name : 'Guest User',
          email: u ? u.email : 'N/A',
          picture: u ? u.picture : '',
          bookings: stats.bookings,
          spend: stats.spend
        };
      })
      .sort((x, y) => y.spend - x.spend)
      .slice(0, 5);

    res.json({
      totalUsers,
      googleUsers,
      verifiedUsers,
      registrationsByMonth,
      topUsers
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

// 4b. Get all platform bookings merged (Admin only)
app.get('/api/users/bookings', protect, adminOnly, async (req, res) => {
  try {
    const HotelBooking = require('./server/models/HotelBooking');
    const Booking = require('./server/models/Booking');

    const listA = await HotelBooking.find().populate('user').populate('hotel');
    const listB = await Booking.find().populate('user');

    const formattedA = listA.map(b => ({
      _id: b._id || b.id,
      id: b.bookingId || (b._id || b.id || '').toString(),
      customerName: b.guestName || (b.user ? b.user.name : 'Unknown Guest'),
      phone: b.guestPhone || 'N/A',
      date: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: b.totalAmount || 0,
      status: b.bookingStatus === 'checked_in' || b.bookingStatus === 'checked_out' ? 'completed' : b.bookingStatus,
      bookingType: 'hotel',
      itemName: b.hotelName || 'Unknown Hotel',
      itemCity: b.hotelCity || 'Unknown City'
    }));

    const formattedB = listB.map(b => ({
      _id: b._id || b.id,
      id: b.bookingId || (b._id || b.id || '').toString(),
      customerName: b.customerName || (b.user ? b.user.name : 'Unknown Customer'),
      phone: b.customerPhone || 'N/A',
      date: b.bookingDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      amount: b.amount,
      status: b.status,
      bookingType: b.bookingType || 'cab',
      itemName: b.itemName || 'Unknown Item',
      itemCity: b.itemCity || 'Unknown City'
    }));

    const merged = [...formattedA, ...formattedB].sort((x, y) => new Date(y.date) - new Date(x.date));
    res.json(merged);
  } catch (err) {
    console.error('Error fetching platform bookings:', err);
    res.status(500).json({ error: 'Failed to fetch platform bookings' });
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
    );
    if (user && user.toObject) {
      // In case it's a mongoose document
      delete user.password;
    } else if (user) {
      delete user.password;
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'Verification status updated',
      user: { id: user._id ? user._id.toString() : (user.id || '').toString(), name: user.name, verified: user.verified }
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

/* --- HOTEL & BOOKING ROUTES --- */
const hotelRoutes = require('./routes/hotelRoutes');
const hotelBookingRoutes = require('./routes/hotelBookingRoutes');
const { router: adminAuthRoutes } = require('./routes/adminAuth');
const cabRoutes = require('./routes/cabRoutes');
const tripBundleRoutes = require('./routes/tripBundleRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const profileRoutes = require('./routes/profileRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const ratingRoutes = require('./routes/ratingRoutes');

app.use('/api/hotels', hotelRoutes);
app.use('/api/hotel-bookings', hotelBookingRoutes);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/cabs', cabRoutes);
app.use('/api/trip-bundles', tripBundleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ratings', ratingRoutes);

// Redirect /admin to /admin-login.html
app.get('/admin', (req, res) => {
  res.redirect('/admin-login.html');
});

// Contact Message endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    
    // Basic validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }
    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const newMessage = await ContactMessage.create({
      name: name.trim(),
      email: emailLower,
      subject: subject.trim(),
      message: message.trim()
    });

    res.status(201).json({ success: true, message: 'Message sent successfully! We will get back to you soon.', data: newMessage });
  } catch (err) {
    console.error('Contact message error:', err);
    res.status(500).json({ error: 'Failed to save contact message. Please try again later.' });
  }
});

// Newsletter endpoints
app.post('/api/newsletter/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const emailLower = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailLower)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const existing = await Subscriber.findOne({ email: emailLower });
    if (existing) {
      return res.status(400).json({ error: 'This email is already subscribed' });
    }

    await Subscriber.create({ email: emailLower });
    res.status(201).json({ message: 'Subscribed successfully! Thank you for staying tuned.' });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe. Please try again later.' });
  }
});

app.get('/api/newsletter/subscribers', protect, adminOnly, async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ createdAt: -1 });
    res.json(subscribers);
  } catch (err) {
    console.error('Newsletter fetch subscribers error:', err);
    res.status(500).json({ error: 'Failed to fetch subscribers list' });
  }
});

app.delete('/api/newsletter/subscribers/:id', protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await Subscriber.findByIdAndDelete(id);
    if (!subscriber) {
      return res.status(404).json({ error: 'Subscriber not found' });
    }
    res.json({ success: true, message: 'Subscriber deleted successfully' });
  } catch (err) {
    console.error('Newsletter delete subscriber error:', err);
    res.status(500).json({ error: 'Failed to delete subscriber' });
  }
});

// Start backend server
app.listen(PORT, () => {
  console.log(`🚀 Make My Travel server running at: http://localhost:${PORT}`);
});
