const express = require('express');
const router = express.Router();
const {
  getTodayReminders,
  updateReminderStatus,
  getReminderHistory,
  getHealthSummary,
  saveFcmToken,
  getNotifications,
  postReminderAction,
  triggerSchedulerCheck
} = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

router.get('/trigger-check', triggerSchedulerCheck);
router.post('/action', postReminderAction); // Public endpoint for background notification action button clicks

router.use(protect); // protect all reminder routes

router.get('/today', getTodayReminders);
router.put('/status/:logId', updateReminderStatus);
router.get('/history', getReminderHistory);
router.get('/summary', getHealthSummary);
router.post('/fcm-token', saveFcmToken);
router.get('/notifications', getNotifications);

module.exports = router;

