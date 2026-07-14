const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const HotelBooking = require('../models/HotelBooking');

// GET /api/bookings (returns merged hotel bookings & cab/package bookings)
router.get('/', async (req, res) => {
  try {
    const listA = await HotelBooking.find().populate('user').populate('hotel');
    const listB = await Booking.find();

    const formattedA = listA.map(b => ({
      _id: b._id || b.id,
      id: b.bookingId || (b._id || b.id || '').toString(),
      customerName: b.guestName || (b.user ? b.user.name : 'Unknown Guest'),
      phone: b.guestPhone || 'N/A',
      date: b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: b.totalAmount || 0,
      status: b.bookingStatus === 'checked_in' || b.bookingStatus === 'checked_out' ? 'completed' : b.bookingStatus,
      isHotelBooking: true
    }));

    const formattedB = listB.map(b => ({
      _id: b._id || b.id,
      id: b.bookingId || (b._id || b.id || '').toString(),
      customerName: b.customerName,
      phone: b.customerPhone,
      date: b.bookingDate || (b.createdAt ? new Date(b.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
      amount: b.amount,
      status: b.status,
      isHotelBooking: false
    }));

    const merged = [...formattedA, ...formattedB].sort((x, y) => new Date(y.date) - new Date(x.date));
    res.json(merged);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const { protect, adminOnly } = require('../middleware/auth');

// POST /api/bookings
router.post('/', protect, async (req, res) => {
  try {
    req.body.user = req.user._id;
    const { customerName, customerPhone, customerEmail, bookingType, amount, promoCode, subtotal } = req.body;

    if (!customerName || !customerName.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!customerPhone || !customerPhone.trim()) {
      return res.status(400).json({ error: 'Customer phone number is required.' });
    }
    if (!customerEmail || !customerEmail.trim()) {
      return res.status(400).json({ error: 'Customer email address is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail.trim())) {
      return res.status(400).json({ error: 'Customer email address must be a valid email format.' });
    }
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      return res.status(400).json({ error: 'Customer phone number must be a valid numeric phone format (10-15 digits).' });
    }

    let discount = 0;
    const User = require('../models/User');

    if (promoCode) {
      const code = promoCode.toUpperCase().trim();
      const verifiedSubtotal = subtotal || Math.round(amount / 1.18);
      
      // 1. Validate promo code matches booking type
      if (bookingType === 'cab') {
        if (code !== 'CAR15' && code !== 'PASS20') {
          return res.status(400).json({ error: 'Invalid promo code for cab bookings.' });
        }
        if (code === 'CAR15') {
          // Verify lock requirement: invitesSent >= 1
          if (req.user.invitesSent < 1) {
            return res.status(400).json({ error: 'Promo code CAR15 is locked! You must invite at least 1 friend to unlock this offer.' });
          }
          discount = Math.round(verifiedSubtotal * 0.15);
        } else if (code === 'PASS20') {
          // Verify lock requirement: cabsBookedCount >= 3
          if (req.user.cabsBookedCount < 3) {
            return res.status(400).json({ error: 'Promo code PASS20 is locked! Book at least 3 cab rides to unlock this offer.' });
          }
          discount = Math.round(verifiedSubtotal * 0.20);
        }
      } else if (bookingType === 'package') {
        if (code !== 'TRAVEL30') {
          return res.status(400).json({ error: 'Invalid promo code for holiday packages.' });
        }
        // Verify lock requirement: cabsBookedCount >= 1
        if (req.user.cabsBookedCount < 1) {
          return res.status(400).json({ error: 'Promo code TRAVEL30 is locked! You must book at least 1 cab ride to unlock this offer.' });
        }
        discount = Math.round(verifiedSubtotal * 0.30);
      } else {
        return res.status(400).json({ error: 'Invalid booking type for promo codes.' });
      }

      // 2. Check if user already used this promo code on a non-cancelled booking
      const alreadyUsedOthers = await Booking.findOne({
        user: req.user._id,
        promoCode: code,
        status: { $ne: 'cancelled' }
      });
      const alreadyUsedHotels = await HotelBooking.findOne({
        user: req.user._id,
        promoCode: code,
        bookingStatus: { $ne: 'cancelled' }
      });

      if (alreadyUsedOthers || alreadyUsedHotels) {
        return res.status(400).json({ error: 'You have already used this promo code.' });
      }

      req.body.promoCode = code;
      req.body.discount = discount;
      req.body.subtotal = verifiedSubtotal;
      const taxes = Math.round(verifiedSubtotal * 0.18);
      req.body.amount = verifiedSubtotal + taxes - discount;
    } else {
      req.body.promoCode = '';
      req.body.discount = 0;
      req.body.subtotal = subtotal || Math.round(amount / 1.18);
    }

    const booking = await Booking.create(req.body);

    // If successful cab booking, increment cabsBookedCount
    if (bookingType === 'cab') {
      await User.findByIdAndUpdate(req.user._id, { $inc: { cabsBookedCount: 1 } });
    }

    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already used this promo code.' });
    }
    console.error('Booking error:', err);
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/bookings/:id (update booking status)
router.put('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }

    const targetStatus = status.toLowerCase().trim();
    const isAdmin = req.user.role === 'admin';

    // Helper to verify listing owner for generic Booking
    async function verifyGenericBookingOwner(booking) {
      if (booking.bookingType === 'cab') {
        const Cab = require('../models/Cab');
        let cabOwnerId = null;
        if (booking.cabId) {
          const cab = await Cab.findById(booking.cabId);
          if (cab) cabOwnerId = cab.user;
        } else {
          const cab = await Cab.findOne({ vehicle: booking.itemName });
          if (cab) cabOwnerId = cab.user;
        }
        return cabOwnerId && cabOwnerId.toString() === req.user._id.toString();
      } else if (booking.bookingType === 'package') {
        const TripBundle = require('../models/TripBundle');
        let pkgOwnerId = null;
        if (booking.packageId) {
          const pkg = await TripBundle.findById(booking.packageId);
          if (pkg) pkgOwnerId = pkg.user;
        } else {
          const pkg = await TripBundle.findOne({ name: booking.itemName });
          if (pkg) pkgOwnerId = pkg.user;
        }
        return pkgOwnerId && pkgOwnerId.toString() === req.user._id.toString();
      }
      return false;
    }

    // Helper to verify listing owner for HotelBooking
    async function verifyHotelBookingOwner(hb) {
      const Hotel = require('../models/Hotel');
      const hotel = await Hotel.findById(hb.hotel);
      const hotelOwnerId = hotel ? hotel.user : null;
      return hotelOwnerId && hotelOwnerId.toString() === req.user._id.toString();
    }

    // Check custom Booking collection first
    let booking = await Booking.findById(id);
    if (!booking) {
      booking = await Booking.findOne({ bookingId: id });
    }

    if (booking) {
      // Apply authorization checks
      if (['confirmed', 'rejected', 'pending'].includes(targetStatus)) {
        const isOwner = await verifyGenericBookingOwner(booking);
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ error: 'You can only confirm, reject, or set pending status for bookings on your own listings.' });
        }
      } else if (targetStatus === 'cancelled') {
        const isCustomer = booking.user && booking.user.toString() === req.user._id.toString();
        if (!isCustomer && !isAdmin) {
          return res.status(403).json({ error: 'You can only cancel your own bookings.' });
        }
      } else {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Only administrators can perform this action.' });
        }
      }

      booking.status = targetStatus;
      await booking.save();
      return res.json(booking);
    }

    // Check HotelBooking collection
    let hotelBooking = await HotelBooking.findById(id);
    if (!hotelBooking) {
      hotelBooking = await HotelBooking.findOne({ bookingId: id });
    }

    if (hotelBooking) {
      let mappedStatus = targetStatus;
      if (mappedStatus === 'completed') mappedStatus = 'checked_out';

      // Apply authorization checks
      if (['confirmed', 'rejected', 'pending'].includes(mappedStatus)) {
        const isOwner = await verifyHotelBookingOwner(hotelBooking);
        if (!isOwner && !isAdmin) {
          return res.status(403).json({ error: 'You can only confirm, reject, or set pending status for bookings on your own listings.' });
        }
      } else if (mappedStatus === 'cancelled') {
        const isCustomer = hotelBooking.user && hotelBooking.user.toString() === req.user._id.toString();
        if (!isCustomer && !isAdmin) {
          return res.status(403).json({ error: 'You can only cancel your own bookings.' });
        }
      } else {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Only administrators can perform this action.' });
        }
      }

      hotelBooking.bookingStatus = mappedStatus;
      await hotelBooking.save();
      return res.json(hotelBooking);
    }

    res.status(404).json({ error: 'Booking not found' });
  } catch (err) {
    console.error('Error in PUT /api/bookings/:id:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/bookings/by-type/:type (Get bookings by type - admin only)
router.get('/by-type/:type', protect, adminOnly, async (req, res) => {
  try {
    const { type } = req.params;
    if (!['cab', 'package'].includes(type)) {
      return res.status(400).json({ error: 'Invalid booking type' });
    }
    const bookings = await Booking.find({ bookingType: type })
      .populate('user', 'name email phone picture')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/bookings/stats/:type (Get stats by type - admin only)
router.get('/stats/:type', protect, adminOnly, async (req, res) => {
  try {
    const { type } = req.params;
    if (!['cab', 'package'].includes(type)) {
      return res.status(400).json({ error: 'Invalid booking type' });
    }

    const totalBookings = await Booking.countDocuments({ bookingType: type });

    // Total revenue from confirmed or completed bookings
    const revenueResult = await Booking.aggregate([
      { $match: { bookingType: type, status: { $in: ['confirmed', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Bookings by status
    const statusAgg = await Booking.aggregate([
      { $match: { bookingType: type } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    const bookingsByStatus = {
      pending: 0, confirmed: 0, completed: 0, cancelled: 0
    };
    statusAgg.forEach(s => {
      const statusKey = s._id ? s._id.toLowerCase() : 'pending';
      if (statusKey in bookingsByStatus) {
        bookingsByStatus[statusKey] = s.count;
      }
    });

    // Revenue by month (current year)
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await Booking.aggregate([
      {
        $match: {
          bookingType: type,
          status: { $in: ['confirmed', 'completed'] },
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = months.map((month, i) => {
      const found = monthlyRevenue.find(m => m._id === i + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    // Top 5 items (vehicle model or package name)
    const topItems = await Booking.aggregate([
      { $match: { bookingType: type } },
      {
        $group: {
          _id: '$itemName',
          bookings: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 }
    ]);

    // City / Destination breakdown
    const cityBreakdown = await Booking.aggregate([
      { $match: { bookingType: type } },
      {
        $group: {
          _id: '$itemCity',
          bookings: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { bookings: -1 } }
    ]);

    res.json({
      totalBookings,
      totalRevenue,
      bookingsByStatus,
      revenueByMonth,
      topItems: topItems.map(item => ({
        name: item._id || 'Unknown',
        bookings: item.bookings,
        revenue: item.revenue
      })),
      cityBreakdown: cityBreakdown.map(city => ({
        city: city._id || 'Unknown',
        bookings: city.bookings,
        revenue: city.revenue
      }))
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
