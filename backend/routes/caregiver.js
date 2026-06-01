const express = require('express');
const router = express.Router();
const {
  getPatients,
  linkPatient,
  unlinkPatient,
  getPatientsOverview,
  getCaregiverAlerts,
  resolveCaregiverAlert
} = require('../controllers/caregiverController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect); // protect all caregiver routes

router.get('/patients', getPatients);
router.post('/link', linkPatient);
router.post('/unlink', unlinkPatient);
router.get('/overview', getPatientsOverview);
router.get('/alerts', getCaregiverAlerts);
router.post('/alerts/resolve', resolveCaregiverAlert);

module.exports = router;

