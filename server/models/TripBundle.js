const mongoose = require('mongoose');

const tripBundleSchema = new mongoose.Schema({
  packageId: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  destination: {
    type: String,
    required: true
  },
  days: {
    type: Number,
    default: 3
  },
  nights: {
    type: Number,
    default: 2
  },
  price: {
    type: Number,
    required: true
  },
  inclusions: {
    type: String
  },
  images: [String],
  status: {
    type: String,
    enum: ['Approved', 'Pending', 'Rejected'],
    default: 'Pending'
  },
  partnerEmail: {
    type: String
  }
}, {
  timestamps: true
});

const realModel = mongoose.model('TripBundle', tripBundleSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('TripBundle', realModel);

