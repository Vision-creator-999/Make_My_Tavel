require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('⚠️ Could not configure custom DNS servers, using system default.');
}
const mongoose = require('mongoose');
const User = require('./models/User');
const Hotel = require('./models/Hotel');
const HotelBooking = require('./models/HotelBooking');

async function seed() {
  try {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('✅ Connected to MongoDB Atlas');
    } catch (connErr) {
      console.warn('⚠️ Could not connect to MongoDB Atlas. Seeding local JSON database fallback instead!');
    }

    // Clear existing hotel and booking data
    await Hotel.deleteMany({});
    await HotelBooking.deleteMany({});
    console.log('🗑️  Cleared existing hotel and booking data');

    // Create sample users if they don't exist
    const sampleUsers = [
      {
        name: 'Rahul Sharma',
        email: 'rahul@example.com',
        password: 'password123',
        authProvider: 'credentials',
        verified: true,
        role: 'admin',
        phone: '+91 98765 43210',
        picture: 'https://i.pravatar.cc/80?img=11'
      },
      {
        name: 'Sneha Kapoor',
        email: 'sneha@example.com',
        password: 'password123',
        authProvider: 'credentials',
        verified: true,
        role: 'user',
        phone: '+91 98765 43211',
        picture: 'https://i.pravatar.cc/80?img=47'
      },
      {
        name: 'Arjun Desai',
        email: 'arjun@example.com',
        password: 'password123',
        authProvider: 'credentials',
        verified: true,
        role: 'user',
        phone: '+91 98765 43212',
        picture: 'https://i.pravatar.cc/80?img=68'
      }
    ];

    for (const userData of sampleUsers) {
      const existing = await User.findOne({ email: userData.email });
      if (!existing) {
        await User.create(userData);
        console.log(`  👤 Created user: ${userData.name} (${userData.role})`);
      } else {
        // Update role if needed
        if (userData.role === 'admin' && existing.role !== 'admin') {
          existing.role = 'admin';
          await existing.save();
          console.log(`  👤 Updated ${userData.name} to admin`);
        }
      }
    }

    const users = await User.find({ email: { $in: sampleUsers.map(u => u.email) } });
    console.log(`\n📋 ${users.length} users ready for seeding bookings\n`);

    // ═══════════════════════════════════════════════════
    // HOTEL 1: Sea View Resort & Spa — Goa
    // ═══════════════════════════════════════════════════
    const hotel1 = await Hotel.create({
      name: 'Sea View Resort & Spa',
      description: 'Experience luxury and comfort at Sea View Resort & Spa, located on the pristine Candolim Beach. Enjoy breathtaking sea views, world-class amenities and warm hospitality.',
      city: 'Goa',
      location: 'Candolim Beach, North Goa',
      address: 'Candolim Beach, North Goa, Goa - 403515, India',
      pricePerNight: 12999,
      rating: 4.6,
      totalReviews: 1200,
      images: [
        'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
        'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800&q=80'
      ],
      badge: 'Popular Choice',
      status: 'Approved',
      ownerName: 'Rahul Sharma',
      mobile: '+91 98765 43210',
      email: 'rahul@example.com',
      amenities: ['Free WiFi', 'Swimming Pool', 'Free Parking', 'Restaurant', 'Fitness Centre', 'Spa & Wellness', 'Air Conditioning', 'Laundry Service'],
      rooms: [
        {
          name: 'Deluxe Room',
          type: 'deluxe',
          pricePerNight: 12999,
          capacity: 2,
          bedType: '1 King Bed',
          size: 380,
          features: ['Free WiFi', 'Air Conditioning', 'Mini Bar', 'City View'],
          totalRooms: 20,
          availableRooms: 12,
          freeCancellation: true
        },
        {
          name: 'Executive Room',
          type: 'executive',
          pricePerNight: 15999,
          capacity: 3,
          bedType: '1 King Bed',
          size: 520,
          features: ['Free WiFi', 'Air Conditioning', 'Sea View', 'Mini Bar'],
          totalRooms: 15,
          availableRooms: 8,
          freeCancellation: true
        },
        {
          name: 'Family Suite',
          type: 'suite',
          pricePerNight: 21999,
          capacity: 4,
          bedType: '2 King Beds',
          size: 500,
          features: ['Free WiFi', 'Air Conditioning', '2 Bathrooms', 'Sea View'],
          totalRooms: 10,
          availableRooms: 5,
          freeCancellation: true
        },
        {
          name: 'Presidential Suite',
          type: 'presidential',
          pricePerNight: 34999,
          capacity: 4,
          bedType: '2 King Beds',
          size: 980,
          features: ['Free WiFi', 'Air Conditioning', 'Private Pool', 'Butler Service'],
          totalRooms: 5,
          availableRooms: 3,
          freeCancellation: true
        }
      ],
      nearbyAttractions: [
        { name: 'Candolim Beach', distance: '2 mins walk' },
        { name: 'Fort Aguada', distance: '6.5 km' },
        { name: 'Baga Beach', distance: '7.2 km' },
        { name: 'Calangute Beach', distance: '8.1 km' }
      ],
      policies: {
        checkIn: 'Check-in at 2:00 PM | Check-out at 11:00 AM',
        checkOut: 'Check-out at 11:00 AM',
        cancellation: 'Free cancellation up to 24 hours before check-in',
        children: 'Children of all ages are welcome',
        pets: 'Pets are not allowed',
        payment: 'We accept all major credit cards, UPI and net banking'
      }
    });
    console.log('🏨 Created: Sea View Resort & Spa (Goa)');

    // ═══════════════════════════════════════════════════
    // HOTEL 2: Mountain Bliss Retreat — Manali
    // ═══════════════════════════════════════════════════
    const hotel2 = await Hotel.create({
      name: 'Mountain Bliss Retreat',
      description: 'Nestled in the heart of Manali, Mountain Bliss Retreat offers stunning valley views and a tranquil escape from the city. Perfect for nature lovers and adventure seekers.',
      city: 'Manali',
      location: 'Old Manali, Himachal Pradesh',
      address: 'Old Manali Road, Manali, Himachal Pradesh - 175131, India',
      pricePerNight: 8999,
      rating: 4.4,
      totalReviews: 850,
      images: [
        'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80',
        'https://images.unsplash.com/photo-1586611292717-f828b167408c?w=800&q=80',
        'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&q=80',
        'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?w=800&q=80'
      ],
      badge: 'Adventure',
      status: 'Approved',
      ownerName: 'Sneha Kapoor',
      mobile: '+91 98765 43211',
      email: 'sneha@example.com',
      amenities: ['Free WiFi', 'Fireplace Lounge', 'Spa & Wellness', 'Restaurant', 'Valley View', 'Bonfire Area', 'Trekking Arranged', 'Room Heater'],
      rooms: [
        {
          name: 'Mountain View Room',
          type: 'deluxe',
          pricePerNight: 8999,
          capacity: 2,
          bedType: '1 Queen Bed',
          size: 320,
          features: ['Free WiFi', 'Valley View', 'Room Heater', 'Hot Water'],
          totalRooms: 15,
          availableRooms: 9,
          freeCancellation: true
        },
        {
          name: 'Premium Cottage',
          type: 'executive',
          pricePerNight: 12999,
          capacity: 3,
          bedType: '1 King Bed',
          size: 450,
          features: ['Free WiFi', 'Private Balcony', 'Fireplace', 'Valley View'],
          totalRooms: 10,
          availableRooms: 6,
          freeCancellation: true
        },
        {
          name: 'Luxury Alpine Suite',
          type: 'suite',
          pricePerNight: 18999,
          capacity: 4,
          bedType: '2 Queen Beds',
          size: 600,
          features: ['Free WiFi', 'Living Room', 'Fireplace', 'Panoramic View', 'Jacuzzi'],
          totalRooms: 5,
          availableRooms: 3,
          freeCancellation: true
        }
      ],
      nearbyAttractions: [
        { name: 'Hadimba Temple', distance: '1.5 km' },
        { name: 'Solang Valley', distance: '13 km' },
        { name: 'Mall Road', distance: '2 km' },
        { name: 'Rohtang Pass', distance: '51 km' }
      ],
      policies: {
        checkIn: 'Check-in at 1:00 PM | Check-out at 11:00 AM',
        checkOut: 'Check-out at 11:00 AM',
        cancellation: 'Free cancellation up to 48 hours before check-in',
        children: 'Children above 5 years welcome',
        pets: 'Small pets allowed on request',
        payment: 'Credit cards, debit cards, UPI accepted'
      }
    });
    console.log('🏔️  Created: Mountain Bliss Retreat (Manali)');

    // ═══════════════════════════════════════════════════
    // HOTEL 3: Heritage Palace Hotel — Jaipur
    // ═══════════════════════════════════════════════════
    const hotel3 = await Hotel.create({
      name: 'Heritage Palace Hotel',
      description: 'Step into royal Rajasthani luxury at Heritage Palace Hotel. This beautifully restored haveli offers a glimpse into royal Rajput heritage with modern comforts.',
      city: 'Jaipur',
      location: 'Civil Lines, Jaipur',
      address: 'MI Road, Civil Lines, Jaipur, Rajasthan - 302001, India',
      pricePerNight: 15999,
      rating: 4.8,
      totalReviews: 980,
      images: [
        'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=80',
        'https://images.unsplash.com/photo-1585468274952-66591eb14165?w=800&q=80',
        'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80',
        'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=800&q=80'
      ],
      badge: 'Luxury Pick',
      status: 'Approved',
      ownerName: 'Arjun Desai',
      mobile: '+91 98765 43212',
      email: 'arjun@example.com',
      amenities: ['Free WiFi', 'Swimming Pool', 'Spa & Wellness', 'Restaurant', 'Heritage Tours', 'Cultural Performances', 'Rooftop Dining', 'Airport Transfer'],
      rooms: [
        {
          name: 'Royal Heritage Room',
          type: 'deluxe',
          pricePerNight: 15999,
          capacity: 2,
          bedType: '1 King Bed',
          size: 420,
          features: ['Free WiFi', 'Heritage Décor', 'Courtyard View', 'Mini Bar'],
          totalRooms: 18,
          availableRooms: 10,
          freeCancellation: true
        },
        {
          name: 'Maharaja Suite',
          type: 'suite',
          pricePerNight: 25999,
          capacity: 3,
          bedType: '1 Emperor Bed',
          size: 650,
          features: ['Free WiFi', 'Royal Furnishings', 'Private Courtyard', 'Butler Service'],
          totalRooms: 8,
          availableRooms: 4,
          freeCancellation: true
        },
        {
          name: 'Grand Palace Suite',
          type: 'presidential',
          pricePerNight: 45999,
          capacity: 4,
          bedType: '2 King Beds',
          size: 1100,
          features: ['Free WiFi', 'Royal Living Room', 'Private Pool', 'Personal Chef', 'Heritage Tour'],
          totalRooms: 3,
          availableRooms: 2,
          freeCancellation: true
        }
      ],
      nearbyAttractions: [
        { name: 'Hawa Mahal', distance: '1.2 km' },
        { name: 'Amber Fort', distance: '11 km' },
        { name: 'City Palace', distance: '1.5 km' },
        { name: 'Jantar Mantar', distance: '1 km' }
      ],
      policies: {
        checkIn: 'Check-in at 2:00 PM | Check-out at 12:00 PM',
        checkOut: 'Check-out at 12:00 PM',
        cancellation: 'Free cancellation up to 24 hours before check-in',
        children: 'Children of all ages are welcome',
        pets: 'Pets not allowed',
        payment: 'All major credit cards, UPI, net banking accepted'
      }
    });
    console.log('🏰 Created: Heritage Palace Hotel (Jaipur)');

    // ═══════════════════════════════════════════════════
    // SEED 10 SAMPLE BOOKINGS
    // ═══════════════════════════════════════════════════
    console.log('\n📝 Creating sample bookings...');

    const hotels = [hotel1, hotel2, hotel3];
    const bookingConfigs = [
      { hotelIdx: 0, roomIdx: 0, status: 'confirmed',   payment: 'online',       daysOffset: -2,  nights: 3 },
      { hotelIdx: 1, roomIdx: 0, status: 'confirmed',   payment: 'online',       daysOffset: 1,   nights: 2 },
      { hotelIdx: 2, roomIdx: 0, status: 'checked_in',  payment: 'online',       daysOffset: 0,   nights: 4 },
      { hotelIdx: 0, roomIdx: 1, status: 'checked_in',  payment: 'pay_at_hotel', daysOffset: -1,  nights: 2 },
      { hotelIdx: 1, roomIdx: 1, status: 'checked_out', payment: 'online',       daysOffset: -10, nights: 3 },
      { hotelIdx: 2, roomIdx: 1, status: 'checked_out', payment: 'online',       daysOffset: -8,  nights: 5 },
      { hotelIdx: 0, roomIdx: 2, status: 'checked_out', payment: 'online',       daysOffset: -15, nights: 2 },
      { hotelIdx: 1, roomIdx: 2, status: 'cancelled',   payment: 'online',       daysOffset: 5,   nights: 3 },
      { hotelIdx: 2, roomIdx: 2, status: 'confirmed',   payment: 'online',       daysOffset: 7,   nights: 2 },
      { hotelIdx: 0, roomIdx: 3, status: 'confirmed',   payment: 'pay_at_hotel', daysOffset: 10,  nights: 4 }
    ];

    for (let i = 0; i < bookingConfigs.length; i++) {
      const config = bookingConfigs[i];
      const hotel = hotels[config.hotelIdx];
      const room = hotel.rooms[config.roomIdx];
      const user = users[i % users.length];

      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + config.daysOffset);
      checkIn.setHours(14, 0, 0, 0);

      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + config.nights);
      checkOut.setHours(11, 0, 0, 0);

      const subtotal = room.pricePerNight * config.nights;
      const taxes = Math.round(subtotal * 0.18);
      const discount = i % 4 === 0 ? Math.round(subtotal * 0.2) : 0;
      const totalAmount = subtotal + taxes - discount;

      let paymentStatus;
      if (config.status === 'cancelled') {
        paymentStatus = 'refunded';
      } else if (config.payment === 'pay_at_hotel') {
        paymentStatus = 'pending';
      } else {
        paymentStatus = 'paid';
      }

      const bookingData = {
        bookingId: 'HTL' + (Date.now() + i * 1000),
        user: user._id,
        hotel: hotel._id,
        hotelName: hotel.name,
        hotelCity: hotel.city,
        roomType: room.type,
        roomName: room.name,
        pricePerNight: room.pricePerNight,
        checkIn,
        checkOut,
        nights: config.nights,
        guests: Math.min(room.capacity, Math.floor(Math.random() * 3) + 1),
        rooms: 1,
        subtotal,
        taxes,
        discount,
        totalAmount,
        promoCode: discount > 0 ? 'HOTEL20' : '',
        paymentMethod: config.payment,
        paymentStatus,
        bookingStatus: config.status,
        guestName: user.name,
        guestEmail: user.email,
        guestPhone: user.phone || '+91 98765 4321' + i,
        specialRequests: i % 3 === 0 ? 'Early check-in requested' : ''
      };

      // Add timestamps based on status
      if (['checked_in', 'checked_out'].includes(config.status)) {
        bookingData.checkedInAt = new Date(checkIn);
      }
      if (config.status === 'checked_out') {
        bookingData.checkedOutAt = new Date(checkOut);
      }
      if (config.status === 'cancelled') {
        bookingData.cancelledAt = new Date();
        bookingData.cancellationReason = 'Change of plans';
      }

      await HotelBooking.create(bookingData);
      console.log(`  📋 Booking #${i + 1}: ${hotel.name} — ${room.name} (${config.status})`);
    }

    // ═══════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════
    const totalHotels = await Hotel.countDocuments();
    const totalBookings = await HotelBooking.countDocuments();
    const totalUsers = await User.countDocuments();

    console.log('\n' + '═'.repeat(50));
    console.log('  SEED COMPLETE');
    console.log('═'.repeat(50));
    console.log(`  🏨 Hotels:   ${totalHotels}`);
    console.log(`  📋 Bookings: ${totalBookings}`);
    console.log(`  👤 Users:    ${totalUsers}`);
    console.log('═'.repeat(50));
    console.log('\n  📧 Admin Login:');
    console.log('     Email:    rahul@example.com');
    console.log('     Password: password123');
    console.log('\n  📧 User Login:');
    console.log('     Email:    sneha@example.com');
    console.log('     Password: password123\n');

    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('Database connection closed.');
    } else {
      console.log('Seeded local fallback data files successfully.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  }
}

seed();
