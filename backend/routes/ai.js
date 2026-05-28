const express = require('express');
const router = express.Router();
const { getHabitAnalysis, askChatbot } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all AI routes

router.get('/analysis', getHabitAnalysis);
router.post('/chat', askChatbot);

module.exports = router;
