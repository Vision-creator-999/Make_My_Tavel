const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: true
  },
  hotelId: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userPicture: {
    type: String,
    default: ''
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// One review per user per hotel
ratingSchema.index({ hotel: 1, user: 1 }, { unique: true });

const realModel = mongoose.model('Rating', ratingSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('Rating', realModel);
