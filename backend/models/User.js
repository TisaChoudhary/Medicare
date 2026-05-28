const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['elderly', 'caregiver'],
    default: 'elderly'
  },
  phone: {
    type: String,
    trim: true
  },
  // If role is 'elderly', link to caregiver
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  emergencyContactName: {
    type: String,
    trim: true
  },
  emergencyContactPhone: {
    type: String,
    trim: true
  },
  language: {
    type: String,
    default: 'en' // 'en', 'es', 'hi'
  },
  theme: {
    type: String,
    default: 'light' // 'light', 'dark'
  },
  voiceAssistantActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', UserSchema);
