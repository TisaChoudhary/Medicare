const express = require('express');
const router = express.Router();
const {
  analyzePrescriptionText,
  saveReport,
  getReports
} = require('../controllers/medicalReportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all report routes

router.post('/analyze', analyzePrescriptionText);
router.post('/save', saveReport);
router.get('/', getReports);

module.exports = router;
