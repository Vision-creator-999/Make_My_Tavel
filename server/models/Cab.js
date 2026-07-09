const mongoose = require('mongoose');

const cabSchema = new mongoose.Schema({
  cabId: {
    type: String
  },
  owner: {
    type: String, // Kept for backwards compatibility
    required: false
  },
  driver: {
    type: String, // Maps to driverName in form
    required: true
  },
  mobile: {
    type: String, // Maps to driverPhone in form
    required: true
  },
  driverEmail: {
    type: String
  },
  driverExp: {
    type: Number
  },
  licenseNum: {
    type: String
  },
  vehicle: {
    type: String, // Maps to cabModel
    required: true
  },
  category: {
    type: String // Maps to cabCategory
  },
  plate: {
    type: String, // Maps to plateNumber
    required: true
  },
  seats: {
    type: String // Maps to cabCapacity (e.g., '4 Seater')
  },
  city: {
    type: String // Maps to driverCity
  },
  ratePerKm: {
    type: Number
  },
  aadhaar: {
    type: String
  },
  dl: {
    type: String // We can use this for the document upload
  },
  rc: {
    type: String
  },
  insurance: {
    type: String
  },
  images: [String],
  status: {
    type: String,
    enum: ['Approved', 'Pending', 'Rejected'],
    default: 'Pending'
  }
}, {
  timestamps: true
});

const realModel = mongoose.model('Cab', cabSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('Cab', realModel);

