require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const medicineRoutes = require('./routes/medicines');
const reminderRoutes = require('./routes/reminders');
const caregiverRoutes = require('./routes/caregiver');
const aiRoutes = require('./routes/ai');
const reportRoutes = require('./routes/medicalReports');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/caregiver', caregiverRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportRoutes);

// Simple Health Check
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'healthy', timestamp: new Date() });
});

const { startScheduler } = require('./services/scheduler');

// Start Express Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startScheduler();
});

// MongoDB Connection (Asynchronous)
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/medicare-ai';
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connection established successfully.');
  })
  .catch((err) => {
    console.warn('\n⚠️  WARNING: Failed to connect to MongoDB:', err.message);
    console.warn('👉 The Express server is still running on port ' + PORT + ', but database actions will fail or buffer until you start your MongoDB service (e.g. running "mongod" locally on port 27017).\n');
  });
