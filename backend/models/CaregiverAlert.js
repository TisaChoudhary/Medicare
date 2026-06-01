const mongoose = require('mongoose');

const CaregiverAlertSchema = new mongoose.Schema({
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patientName: {
    type: String,
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  scheduledTime: {
    type: String, // HH:MM
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  resolved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CaregiverAlert', CaregiverAlertSchema);
