const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  name: { type: String },
  type: {
    type: String,
    enum: ['deluxe', 'executive', 'suite', 'presidential']
  },
  pricePerNight: { type: Number },
  capacity: { type: Number },
  bedType: { type: String },
  size: { type: Number },
  features: [String],
  images: [String],
  totalRooms: { type: Number },
  availableRooms: { type: Number },
  freeCancellation: { type: Boolean, default: true }
}, { _id: true });

const hotelSchema = new mongoose.Schema({
  hotelId: {
    type: String
  },
  hotelName: {
    type: String
  },
  category: {
    type: String,
    enum: ['1 Star', '2 Star', '3 Star', '4 Star', '5 Star', 'Approved', 'Pending', 'Rejected'] // cover both star categories and statuses
  },
  ownerName: {
    type: String
  },
  mobile: {
    type: String
  },
  email: {
    type: String
  },
  aadhaar: {
    type: String
  },
  gst: {
    type: String
  },
  status: {
    type: String,
    enum: ['Approved', 'Pending', 'Rejected'],
    default: 'Pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  name: {
    type: String,
    trim: true
  },
  description: {
    type: String
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  location: {
    type: String
  },
  address: {
    type: String
  },
  pricePerNight: {
    type: Number,
    required: [true, 'Price per night is required']
  },
  rating: {
    type: Number,
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  images: [String],
  badge: {
    type: String,
    enum: ['Popular Choice', 'Best Value', 'Luxury Pick', 'Trending', 'Adventure', 'Cozy Stay']
  },
  amenities: [String],
  rooms: [roomSchema],
  nearbyAttractions: [{
    name: { type: String },
    distance: { type: String }
  }],
  policies: {
    checkIn: { type: String },
    checkOut: { type: String },
    cancellation: { type: String },
    children: { type: String },
    pets: { type: String },
    payment: { type: String }
  },
  policy: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Auto-sync name and hotelName, and seed default rooms for booking UI if empty
hotelSchema.pre('save', function() {
  if (this.hotelName && !this.name) {
    this.name = this.hotelName;
  } else if (this.name && !this.hotelName) {
    this.hotelName = this.name;
  }
  
  // Default values for public listing
  if (!this.description) {
    this.description = `Beautiful luxury stay located in the heart of ${this.city || 'the city'}. Experience top class comfort.`;
  }
  if (!this.rating) {
    this.rating = 4.2;
  }
  if (!this.totalReviews) {
    this.totalReviews = 18;
  }
  if (!this.images || this.images.length === 0) {
    this.images = ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"];
  }
  if (!this.badge) {
    this.badge = 'Popular Choice';
  }
  if (!this.amenities || this.amenities.length === 0) {
    this.amenities = ["Free Wi-Fi", "Swimming Pool", "Restaurant", "Room Service", "Air Conditioning"];
  }
  
  // Seed default rooms so the new hotel can be booked in hotel-booking.html
  if (!this.rooms || this.rooms.length === 0) {
    const rate = this.pricePerNight || 3500;
    this.rooms = [
      {
        name: 'Deluxe Room',
        type: 'deluxe',
        pricePerNight: rate,
        capacity: 2,
        bedType: 'Queen Bed',
        size: 28,
        features: ['Free Wi-Fi', 'Flat-screen TV', 'Mini Bar', 'Tea/Coffee Maker'],
        images: ['https://images.unsplash.com/photo-1611891487122-207579d67d98?auto=format&fit=crop&w=600&q=80'],
        totalRooms: 10,
        availableRooms: 10,
        freeCancellation: true
      },
      {
        name: 'Executive Suite',
        type: 'executive',
        pricePerNight: Math.round(rate * 1.5),
        capacity: 3,
        bedType: 'King Bed',
        size: 42,
        features: ['Free Wi-Fi', 'City View', 'Bath Tub', 'Living Area'],
        images: ['https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=600&q=80'],
        totalRooms: 5,
        availableRooms: 5,
        freeCancellation: true
      }
    ];
  }
});

const realModel = mongoose.model('Hotel', hotelSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('Hotel', realModel);

