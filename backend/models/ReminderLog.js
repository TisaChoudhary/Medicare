const mongoose = require('mongoose');

const ReminderLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  medicineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true
  },
  date: {
    type: String, // format YYYY-MM-DD
    required: true
  },
  time: {
    type: String, // format HH:MM
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'taken', 'missed', 'snoozed'],
    default: 'pending'
  },
  takenAt: {
    type: Date,
    default: null
  },
  snoozeCount: {
    type: Number,
    default: 0
  },
  notificationStatus: {
    type: String,
    enum: ['sent', 'failed', 'none'],
    default: 'none'
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastNotificationSentAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update index to query efficiently by user and date
ReminderLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ReminderLog', ReminderLogSchema);
