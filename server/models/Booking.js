const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: {
    type: String
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  bookingDate: {
    type: String
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'cancelled'],
    default: 'pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  bookingType: {
    type: String,
    enum: ['cab', 'package']
  },
  cabId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cab'
  },
  packageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TripBundle'
  },
  itemName: {
    type: String
  },
  itemCity: {
    type: String
  },
  promoCode: {
    type: String
  },
  discount: {
    type: Number,
    default: 0
  },
  subtotal: {
    type: Number
  }
}, {
  timestamps: true
});

bookingSchema.index(
  { user: 1, promoCode: 1 },
  { 
    unique: true, 
    partialFilterExpression: { 
      promoCode: { $gt: "" }, 
      status: { $ne: "cancelled" } 
    } 
  }
);

const realModel = mongoose.model('Booking', bookingSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('Booking', realModel);

