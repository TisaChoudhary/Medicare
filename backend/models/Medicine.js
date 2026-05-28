const mongoose = require('mongoose');

const MedicineSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true, // e.g., "1 pill", "2 capsules", "5ml"
    trim: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'biweekly', 'custom'],
    default: 'daily'
  },
  // Scheduled times of the day (e.g. ["08:00", "14:00", "20:00"])
  timings: {
    type: [String],
    required: true
  },
  beforeAfterFood: {
    type: String,
    enum: ['before', 'after', 'with', 'anytime'],
    default: 'anytime'
  },
  stock: {
    type: Number,
    default: 30 // initial medicine count
  },
  stockAlertThreshold: {
    type: Number,
    default: 5
  },
  prescriptionFile: {
    type: String,
    default: null
  },
  prescriptionFileName: {
    type: String,
    default: null
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Medicine', MedicineSchema);
