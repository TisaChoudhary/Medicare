const mongoose = require('mongoose');

const MedicalReportSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  extractedText: {
    type: String,
    required: true
  },
  aiSummary: {
    type: String,
    required: true
  },
  extractedMedicines: [
    {
      name: { type: String, required: true },
      dosage: { type: String },
      frequency: { type: String },
      timings: [{ type: String }] // e.g. ["08:00", "20:00"]
    }
  ],
  healthInsights: {
    sideEffects: [{ type: String }],
    foodPrecautions: [{ type: String }],
    interactions: [{ type: String }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('MedicalReport', MedicalReportSchema);
