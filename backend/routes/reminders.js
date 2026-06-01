const express = require('express');
const router = express.Router();
const {
  getTodayReminders,
  updateReminderStatus,
  getReminderHistory,
  getHealthSummary,
  saveFcmToken,
  getNotifications,
  postReminderAction
} = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all reminder routes

router.get('/today', getTodayReminders);
router.put('/status/:logId', updateReminderStatus);
router.get('/history', getReminderHistory);
router.get('/summary', getHealthSummary);
router.post('/fcm-token', saveFcmToken);
router.get('/notifications', getNotifications);
router.post('/action', postReminderAction);

module.exports = router;

