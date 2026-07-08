const HotelBooking = require('../models/HotelBooking');
const Hotel = require('../models/Hotel');

/**
 * POST /api/hotel-bookings — Protected
 * Create a new hotel booking
 */
exports.createBooking = async (req, res) => {
  try {
    const {
      hotelId, roomType, roomName, pricePerNight,
      checkIn, checkOut, nights, guests, rooms,
      subtotal, taxes, discount, totalAmount,
      promoCode, paymentMethod, specialRequests, guestPhone
    } = req.body;

    // Validate hotel
    const hotel = await Hotel.findById(hotelId);
    if (!hotel || !hotel.isActive) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Find room and check availability
    const room = hotel.rooms.find(r => r.type === roomType || r.name === roomName);
    if (!room) {
      return res.status(400).json({ error: 'Room type not found in this hotel' });
    }
    const roomsRequested = rooms || 1;
    if (room.availableRooms < roomsRequested) {
      return res.status(400).json({ error: 'Not enough rooms available' });
    }

    // Generate unique booking ID
    const bookingId = 'HTL' + Date.now();

    // Create booking
    const booking = new HotelBooking({
      bookingId,
      user: req.user._id,
      hotel: hotelId,
      hotelName: hotel.name,
      hotelCity: hotel.city,
      roomType,
      roomName: roomName || room.name,
      pricePerNight: pricePerNight || room.pricePerNight,
      checkIn: new Date(checkIn),
      checkOut: new Date(checkOut),
      nights,
      guests,
      rooms: roomsRequested,
      subtotal,
      taxes,
      discount: discount || 0,
      totalAmount,
      promoCode: promoCode || '',
      paymentMethod: paymentMethod || 'online',
      paymentStatus: paymentMethod === 'pay_at_hotel' ? 'pending' : 'paid',
      bookingStatus: 'confirmed',
      guestName: req.user.name,
      guestEmail: req.user.email,
      guestPhone: guestPhone || req.user.phone || '',
      specialRequests: specialRequests || ''
    });

    await booking.save();

    // Reduce available room count
    room.availableRooms -= roomsRequested;
    await hotel.save();

    res.status(201).json(booking);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: 'Failed to create booking' });
  }
};

/**
 * GET /api/hotel-bookings/my-bookings — Protected
 * Get all bookings for the logged-in user
 */
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ user: req.user._id })
      .populate('hotel', 'name city images rating')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching user bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

/**
 * GET /api/hotel-bookings/:id — Protected
 * Get single booking — must be owner or admin
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await HotelBooking.findById(req.params.id)
      .populate('hotel')
      .populate('user', 'name email phone');

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check ownership or admin access
    const userId = booking.user._id ? booking.user._id.toString() : booking.user.toString();
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to view this booking' });
    }

    res.json(booking);
  } catch (err) {
    console.error('Error fetching booking:', err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
};

/**
 * PUT /api/hotel-bookings/:id/cancel — Protected
 * Cancel a confirmed booking
 */
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await HotelBooking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    // Check ownership or admin access
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }

    if (booking.bookingStatus !== 'confirmed') {
      return res.status(400).json({ error: 'Only confirmed bookings can be cancelled' });
    }

    // Update booking status
    booking.bookingStatus = 'cancelled';
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || 'Cancelled by user';

    if (booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }

    await booking.save();

    // Restore room availability
    const hotel = await Hotel.findById(booking.hotel);
    if (hotel) {
      const room = hotel.rooms.find(r => r.type === booking.roomType || r.name === booking.roomName);
      if (room) {
        room.availableRooms += booking.rooms;
        await hotel.save();
      }
    }

    res.json(booking);
  } catch (err) {
    console.error('Error cancelling booking:', err);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

/**
 * GET /api/hotel-bookings/admin/all — Admin only
 * Get all bookings with filters
 */
exports.getAllBookings = async (req, res) => {
  try {
    const { status, city, hotel, startDate, endDate, search } = req.query;

    let filter = {};

    if (status) filter.bookingStatus = status;
    if (city) filter.hotelCity = new RegExp(city, 'i');
    if (hotel) filter.hotel = hotel;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
    }
    if (search) {
      filter.$or = [
        { bookingId: new RegExp(search, 'i') },
        { guestName: new RegExp(search, 'i') },
        { guestEmail: new RegExp(search, 'i') },
        { hotelName: new RegExp(search, 'i') }
      ];
    }

    const bookings = await HotelBooking.find(filter)
      .populate('hotel', 'name city images')
      .populate('user', 'name email phone picture')
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (err) {
    console.error('Error fetching all bookings:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

/**
 * PUT /api/hotel-bookings/:id/status — Admin only
 * Update booking and payment status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.body;

    const booking = await HotelBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;
      if (bookingStatus === 'checked_in') booking.checkedInAt = new Date();
      if (bookingStatus === 'checked_out') booking.checkedOutAt = new Date();
      if (bookingStatus === 'cancelled') {
        booking.cancelledAt = new Date();
        booking.cancellationReason = req.body.reason || 'Cancelled by admin';
        // Restore room availability
        const hotel = await Hotel.findById(booking.hotel);
        if (hotel) {
          const room = hotel.rooms.find(r => r.type === booking.roomType || r.name === booking.roomName);
          if (room) {
            room.availableRooms += booking.rooms;
            await hotel.save();
          }
        }
      }
    }

    if (paymentStatus) {
      booking.paymentStatus = paymentStatus;
    }

    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};
