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

const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP if it blocks OCR client-side assets
}));
app.use(mongoSanitize());

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('The CORS policy for this site does not allow access from the specified Origin.'), false);
      }
    }
    return callback(null, true);
  },
  credentials: true
}));

// Body parser with 10mb limit for base64 uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiters
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' }
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/', generalLimiter);

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

module.exports = app;

