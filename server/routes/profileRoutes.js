const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// GET /api/profile/me — Get logged-in user's profile
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const obj = user.toSafeJSON();
    res.json(obj);
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/profile/me — Update profile fields
router.put('/me', protect, async (req, res) => {
  try {
    const {
      name, phone, dateOfBirth, gender, bio,
      address, preferences
    } = req.body;

    const update = {};
    if (name !== undefined) update.name = name.trim();
    if (phone !== undefined) update.phone = phone.trim();
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (gender !== undefined) update.gender = gender;
    if (bio !== undefined) update.bio = bio.slice(0, 300);
    if (address !== undefined) update.address = address;
    if (preferences !== undefined) update.preferences = preferences;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: true }
    );
    if (user && user.toObject) {
      delete user.password;
    } else if (user) {
      delete user.password;
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Profile updated successfully', user: user.toSafeJSON() });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// PUT /api/profile/me/password — Change password
router.put('/me/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both currentPassword and newPassword are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Google users may not have a password
    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ error: 'Google-authenticated accounts cannot change password here' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ error: 'Current password is incorrect' });

    user.password = newPassword; // pre-save hook will hash it
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/profile/me/bookings — Fetch all bookings for the logged-in user
router.get('/me/bookings', protect, async (req, res) => {
  try {
    // Try to import booking models (may not exist)
    let hotelBookings = [], cabBookings = [], packageBookings = [];

    try {
      const HotelBooking = require('../models/HotelBooking');
      hotelBookings = await HotelBooking.find({ user: req.user._id })
        .sort({ createdAt: -1 }).limit(20).lean();
      hotelBookings = hotelBookings.map(b => ({ ...b, type: 'hotel', id: b._id }));
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }

    try {
      const Booking = require('../models/Booking');
      const other = await Booking.find({ user: req.user._id })
        .sort({ createdAt: -1 }).limit(20).lean();
      cabBookings = other.filter(b => b.bookingType === 'cab').map(b => ({ ...b, type: 'cab', id: b._id }));
      packageBookings = other.filter(b => b.bookingType === 'package').map(b => ({ ...b, type: 'package', id: b._id }));
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }

    const allBookings = [...hotelBookings, ...cabBookings, ...packageBookings]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ bookings: allBookings });
  } catch (err) {
    console.error('Bookings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

module.exports = router;
