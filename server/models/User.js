const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String
  },
  authProvider: {
    type: String,
    enum: ['credentials', 'google'],
    default: 'credentials'
  },
  verified: {
    type: Boolean,
    default: false
  },
  picture: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  googleId: {
    type: String
  },
  phone: {
    type: String,
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    default: 'prefer_not_to_say'
  },
  address: {
    street: { type: String, default: '' },
    city:   { type: String, default: '' },
    state:  { type: String, default: '' },
    country: { type: String, default: 'India' },
    pincode: { type: String, default: '' }
  },
  preferences: {
    currency: { type: String, default: 'INR' },
    language: { type: String, default: 'English' },
    notifications: {
      email:    { type: Boolean, default: true },
      sms:      { type: Boolean, default: false },
      push:     { type: Boolean, default: true }
    }
  },
  loyaltyPoints: {
    type: Number,
    default: 0
  },
  membershipTier: {
    type: String,
    enum: ['Bronze', 'Silver', 'Gold', 'Platinum'],
    default: 'Bronze'
  },
  lastLoginAt: {
    type: Date
  },
  bio: {
    type: String,
    default: '',
    maxlength: 300
  },
  profileCompleted: {
    type: Boolean,
    default: false
  },
  cabsBookedCount: {
    type: Number,
    default: 0
  },
  invitesSent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  if (candidatePassword === this.password) return true;
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (err) {
    return false;
  }
};

// Return user without password
userSchema.methods.toSafeJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  // Add id alias for backward compatibility
  obj.id = obj.id || (obj._id ? obj._id.toString() : '');
  return obj;
};

const realModel = mongoose.model('User', userSchema);
const { wrapModel } = require('../utils/dbFallback');
module.exports = wrapModel('User', realModel);
