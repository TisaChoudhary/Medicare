const express = require('express');
const router = express.Router();
const {
  getTodayReminders,
  updateReminderStatus,
  getReminderHistory,
  getHealthSummary
} = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all reminder routes

router.get('/today', getTodayReminders);
router.put('/status/:logId', updateReminderStatus);
router.get('/history', getReminderHistory);
router.get('/summary', getHealthSummary);

module.exports = router;
