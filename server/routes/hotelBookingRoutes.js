const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const bookingController = require('../controllers/hotelBookingController');

// Protected routes (logged-in users)
router.post('/', protect, bookingController.createBooking);
router.get('/my-bookings', protect, bookingController.getUserBookings);

// Admin routes — must come before /:id to avoid route conflicts
router.get('/admin/all', protect, adminOnly, bookingController.getAllBookings);

// Protected routes with ID params
router.get('/:id', protect, bookingController.getBookingById);
router.put('/:id/cancel', protect, bookingController.cancelBooking);

// Admin-only status update
router.put('/:id/status', protect, adminOnly, bookingController.updateBookingStatus);

module.exports = router;
