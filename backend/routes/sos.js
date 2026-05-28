const express = require('express');
const router = express.Router();
const { triggerSOS, getActiveAlerts, resolveSOS } = require('../controllers/sosController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all SOS routes

router.post('/trigger', triggerSOS);
router.get('/active', getActiveAlerts);
router.put('/resolve/:alertId', resolveSOS);

module.exports = router;
