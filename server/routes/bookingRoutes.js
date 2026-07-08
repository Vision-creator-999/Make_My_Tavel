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
      _id: b._id,
      id: b.bookingId || b._id.toString(),
      customerName: b.guestName || (b.user ? b.user.name : 'Unknown Guest'),
      phone: b.guestPhone || 'N/A',
      date: b.createdAt ? b.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      amount: b.totalAmount || 0,
      status: b.bookingStatus === 'checked_in' || b.bookingStatus === 'checked_out' ? 'completed' : b.bookingStatus,
      isHotelBooking: true
    }));

    const formattedB = listB.map(b => ({
      _id: b._id,
      id: b.bookingId || b._id.toString(),
      customerName: b.customerName,
      phone: b.customerPhone,
      date: b.bookingDate || (b.createdAt ? b.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
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

// POST /api/bookings
router.post('/', async (req, res) => {
  try {
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
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
