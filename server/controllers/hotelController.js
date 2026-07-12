const Hotel = require('../models/Hotel');
const HotelBooking = require('../models/HotelBooking');

/**
 * GET /api/hotels — Public
 * Query params: ?city=&minPrice=&maxPrice=&rating=&amenities=&search=
 */
exports.getAllHotels = async (req, res) => {
  try {
    const { city, minPrice, maxPrice, rating, amenities, search } = req.query;

    let filter = { isActive: true };

    if (city) filter.city = new RegExp(city, 'i');
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }
    if (rating) filter.rating = { $gte: Number(rating) };
    if (amenities) {
      const amenityList = amenities.split(',').map(a => a.trim());
      filter.amenities = { $all: amenityList };
    }
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const hotels = await Hotel.find(filter).sort({ createdAt: -1 });

    // Add available room count to each hotel
    const hotelsWithAvailability = hotels.map(hotel => {
      const hotelObj = hotel.toObject();
      hotelObj.totalAvailableRooms = (hotel.rooms || []).reduce(
        (sum, room) => sum + (room.availableRooms || 0), 0
      );
      return hotelObj;
    });

    res.json(hotelsWithAvailability);
  } catch (err) {
    console.error('Error fetching hotels:', err);
    res.status(500).json({ error: 'Failed to fetch hotels' });
  }
};

/**
 * GET /api/hotels/:id — Public
 */
exports.getHotelById = async (req, res) => {
  try {
    const hotel = await Hotel.findById(req.params.id);
    if (!hotel || !hotel.isActive) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (err) {
    console.error('Error fetching hotel:', err);
    res.status(500).json({ error: 'Failed to fetch hotel' });
  }
};

/**
 * POST /api/hotels — Admin only
 */
exports.createHotel = async (req, res) => {
  try {
    const { name, city, pricePerNight } = req.body;
    if (!name || !city || !pricePerNight) {
      return res.status(400).json({ error: 'Name, city, and price per night are required' });
    }
    // Force status to Pending for new listings
    req.body.status = 'Pending';
    const hotel = await Hotel.create(req.body);
    res.status(201).json(hotel);
  } catch (err) {
    console.error('Error creating hotel:', err);
    res.status(500).json({ error: 'Failed to create hotel' });
  }
};

/**
 * PUT /api/hotels/:id — Admin only
 */
exports.updateHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json(hotel);
  } catch (err) {
    console.error('Error updating hotel:', err);
    res.status(500).json({ error: 'Failed to update hotel' });
  }
};

/**
 * DELETE /api/hotels/:id — Admin only (soft delete)
 */
exports.deleteHotel = async (req, res) => {
  try {
    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }
    res.json({ message: 'Hotel deleted successfully' });
  } catch (err) {
    console.error('Error deleting hotel:', err);
    res.status(500).json({ error: 'Failed to delete hotel' });
  }
};

/**
 * GET /api/hotels/stats — Admin only
 * Returns comprehensive analytics dashboard data
 */
exports.getHotelStats = async (req, res) => {
  try {
    const totalHotels = await Hotel.countDocuments({ isActive: true });
    const totalBookings = await HotelBooking.countDocuments();

    // Total revenue from paid bookings
    const revenueResult = await HotelBooking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Bookings by status
    const statusAgg = await HotelBooking.aggregate([
      { $group: { _id: '$bookingStatus', count: { $sum: 1 } } }
    ]);
    const bookingsByStatus = {
      confirmed: 0, checked_in: 0, checked_out: 0, cancelled: 0, no_show: 0
    };
    statusAgg.forEach(s => { bookingsByStatus[s._id] = s.count; });

    // Occupancy rate
    const totalRoomsAgg = await Hotel.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$rooms' },
      { $group: { _id: null, total: { $sum: '$rooms.totalRooms' } } }
    ]);
    const totalRoomCount = totalRoomsAgg[0]?.total || 1;
    const activeBookings = bookingsByStatus.confirmed + bookingsByStatus.checked_in;
    const occupancyRate = Math.round((activeBookings / totalRoomCount) * 100);

    // Revenue by month (current year)
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = await HotelBooking.aggregate([
      {
        $match: {
          paymentStatus: 'paid',
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenueByMonth = months.map((month, i) => {
      const found = monthlyRevenue.find(m => m._id === i + 1);
      return { month, revenue: found ? found.revenue : 0 };
    });

    // Top 5 hotels by booking count
    const topHotels = await HotelBooking.aggregate([
      {
        $group: {
          _id: '$hotel',
          hotelName: { $first: '$hotelName' },
          hotelCity: { $first: '$hotelCity' },
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } },
      { $limit: 5 }
    ]);

    // City breakdown
    const cityBreakdown = await HotelBooking.aggregate([
      {
        $group: {
          _id: '$hotelCity',
          bookings: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { bookings: -1 } }
    ]);

    res.json({
      totalHotels,
      totalBookings,
      totalRevenue,
      occupancyRate,
      bookingsByStatus,
      revenueByMonth,
      topHotels: topHotels.map(h => ({
        name: h.hotelName,
        city: h.hotelCity,
        bookings: h.bookings,
        revenue: h.revenue
      })),
      cityBreakdown: cityBreakdown.map(c => ({
        city: c._id,
        bookings: c.bookings,
        revenue: c.revenue
      }))
    });
  } catch (err) {
    console.error('Error fetching hotel stats:', err);
    res.status(500).json({ error: 'Failed to fetch hotel stats' });
  }
};

exports.getHotelStatus = async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ hotelId: req.params.hotelId });
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found with the given Reference ID' });
    }
    res.json({
      hotelId: hotel.hotelId,
      name: hotel.name,
      ownerName: hotel.ownerName,
      status: hotel.status,
      city: hotel.city,
      createdAt: hotel.createdAt
    });
  } catch (err) {
    console.error('Error fetching hotel status:', err);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

