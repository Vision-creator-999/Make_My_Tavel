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
    const booking = await Booking.create(req.body);
    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/bookings/:id (update booking status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Check custom Booking collection first
    let booking = await Booking.findById(id);
    if (booking) {
      booking.status = status.toLowerCase();
      await booking.save();
      return res.json(booking);
    }

    // Check by custom bookingId in Booking collection
    booking = await Booking.findOne({ bookingId: id });
    if (booking) {
      booking.status = status.toLowerCase();
      await booking.save();
      return res.json(booking);
    }

    // Check HotelBooking collection
    let hotelBooking = await HotelBooking.findById(id);
    if (hotelBooking) {
      let mappedStatus = status.toLowerCase();
      if (mappedStatus === 'completed') mappedStatus = 'checked_out';
      hotelBooking.bookingStatus = mappedStatus;
      await hotelBooking.save();
      return res.json(hotelBooking);
    }

    // Check by bookingId in HotelBooking
    hotelBooking = await HotelBooking.findOne({ bookingId: id });
    if (hotelBooking) {
      let mappedStatus = status.toLowerCase();
      if (mappedStatus === 'completed') mappedStatus = 'checked_out';
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
