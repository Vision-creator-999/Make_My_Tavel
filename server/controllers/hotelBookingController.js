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
      promoCode, paymentMethod, specialRequests,
      guestName, guestEmail, guestPhone
    } = req.body;

    if (!guestName || !guestName.trim()) {
      return res.status(400).json({ error: 'Guest name is required.' });
    }
    if (!guestPhone || !guestPhone.trim()) {
      return res.status(400).json({ error: 'Guest phone number is required.' });
    }
    if (!guestEmail || !guestEmail.trim()) {
      return res.status(400).json({ error: 'Guest email address is required.' });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail.trim())) {
      return res.status(400).json({ error: 'Guest email address must be a valid email format.' });
    }
    const phoneRegex = /^\+?[0-9]{10,15}$/;
    if (!phoneRegex.test(guestPhone.trim())) {
      return res.status(400).json({ error: 'Guest phone number must be a valid numeric phone format (10-15 digits).' });
    }

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

    // Validate promo code if provided
    let verifiedDiscount = 0;
    if (promoCode) {
      const code = promoCode.toUpperCase().trim();
      const validCodes = ['HOTEL20', 'FIRSTSTAY20', 'MEMBER25', 'LUXE5000', 'WEEKEND1500', 'LONGSTAY15'];
      if (!validCodes.includes(code)) {
        return res.status(400).json({ error: 'Invalid promo code for hotel bookings.' });
      }

      // Check if user already used this promo code (duplicate prevention)
      const Booking = require('../models/Booking');
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

      // Validate lock requirements and calculate discounts based on the code
      if (code === 'HOTEL20') {
        if (req.user.profileCompleted !== true) {
          return res.status(400).json({ error: 'Promo code HOTEL20 is locked! You must complete your user profile under My Profile to unlock this offer.' });
        }
        verifiedDiscount = Math.round(subtotal * 0.20);
      } else if (code === 'FIRSTSTAY20') {
        const priorCount = await HotelBooking.countDocuments({
          user: req.user._id,
          bookingStatus: { $ne: 'cancelled' }
        });
        if (priorCount > 0) {
          return res.status(400).json({ error: 'FIRSTSTAY20 is only valid on your first hotel booking.' });
        }
        verifiedDiscount = Math.min(Math.round(subtotal * 0.20), 2000);
      } else if (code === 'MEMBER25') {
        const bookingCount = await Booking.countDocuments({
          user: req.user._id,
          status: { $ne: 'cancelled' }
        });
        const hotelBookingCount = await HotelBooking.countDocuments({
          user: req.user._id,
          bookingStatus: { $ne: 'cancelled' }
        });
        if ((bookingCount + hotelBookingCount) < 3) {
          return res.status(400).json({ error: 'MEMBER25 is locked! Complete at least 3 bookings to unlock this offer.' });
        }
        verifiedDiscount = Math.round(subtotal * 0.25);
      } else if (code === 'LUXE5000') {
        if (hotel.category !== '5 Star' || subtotal < 25000) {
          return res.status(400).json({ error: 'LUXE5000 is only valid on 5-star hotel bookings above ₹25,000.' });
        }
        verifiedDiscount = 5000;
      } else if (code === 'WEEKEND1500') {
        const checkInDate = new Date(checkIn);
        const day = checkInDate.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
        if (day !== 0 && day !== 5 && day !== 6) {
          return res.status(400).json({ error: 'WEEKEND1500 is only valid for weekend check-ins (Friday to Sunday).' });
        }
        verifiedDiscount = 1500;
      } else if (code === 'LONGSTAY15') {
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        const msDiff = end - start;
        const computedNights = Math.round(msDiff / (1000 * 60 * 60 * 24));
        if (computedNights < 5) {
          return res.status(400).json({ error: 'LONGSTAY15 is only valid for stays of 5 nights or more.' });
        }
        verifiedDiscount = Math.round(subtotal * 0.15);
      }
    }

    const verifiedAmount = subtotal + taxes - verifiedDiscount;

    // Generate unique booking ID
    const bookingId = 'HTL' + Date.now();

    // Create booking
    const booking = await HotelBooking.create({
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
      discount: verifiedDiscount,
      totalAmount: verifiedAmount,
      promoCode: promoCode ? promoCode.toUpperCase().trim() : '',
      paymentMethod: paymentMethod || 'online',
      paymentStatus: paymentMethod === 'pay_at_hotel' ? 'pending' : 'paid',
      bookingStatus: 'confirmed',
      guestName: guestName.trim(),
      guestEmail: guestEmail.trim(),
      guestPhone: guestPhone.trim(),
      specialRequests: specialRequests || ''
    });

    // Reduce available room count
    room.availableRooms -= roomsRequested;
    await hotel.save();

    res.status(201).json(booking);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'You have already used this promo code.' });
    }
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
    if (userId !== (req.user._id || req.user.id || '').toString() && req.user.role !== 'admin') {
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
    if ((booking.user._id || booking.user || '').toString() !== (req.user._id || req.user.id || '').toString() && req.user.role !== 'admin') {
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
