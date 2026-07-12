const mongoose = require('mongoose');

const hotelBookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  hotelName: { type: String },
  hotelCity: { type: String },
  roomType: { type: String },
  roomName: { type: String },
  pricePerNight: { type: Number },
  checkIn: {
    type: Date,
    required: [true, 'Check-in date is required']
  },
  checkOut: {
    type: Date,
    required: [true, 'Check-out date is required']
  },
  nights: { type: Number },
  guests: { type: Number },
  rooms: { type: Number, default: 1 },
  subtotal: { type: Number },
  taxes: { type: Number },
  discount: { type: Number },
  totalAmount: { type: Number },
  promoCode: { type: String },
  paymentMethod: {
    type: String,
    enum: ['online', 'pay_at_hotel'],
    default: 'online'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  bookingStatus: {
    type: String,
    enum: ['confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'confirmed'
  },
  guestName: { type: String },
  guestEmail: { type: String },
  guestPhone: { type: String },
  specialRequests: { type: String },
  cancelledAt: { type: Date },
  cancellationReason: { type: String },
  checkedInAt: { type: Date },
  checkedOutAt: { type: Date },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

hotelBookingSchema.index(
  { user: 1, promoCode: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      promoCode: { $gt: "" }, 
      bookingStatus: { $ne: "cancelled" } 
    } 
  }
);

// Auto-update updatedAt on save
hotelBookingSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

const realModel = mongoose.model('HotelBooking', hotelBookingSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('HotelBooking', realModel);

