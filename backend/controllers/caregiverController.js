const User = require('../models/User');
const ReminderLog = require('../models/ReminderLog');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');
const CaregiverAlert = require('../models/CaregiverAlert');

exports.getPatients = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const patients = await User.find({ caregiverId: req.user.id }).select('-password');
      return res.json({ success: true, patients });
    } else {
      // --- Mock-DB Logic ---
      const patients = mockDb.users
        .filter(u => u.caregiverId === req.user.id)
        .map(u => {
          const clean = { ...u };
          delete clean.password;
          return clean;
        });
      return res.json({ success: true, patients });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving patients', error: error.message });
  }
};

exports.linkPatient = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const { patientEmail } = req.body;
    if (!patientEmail) {
      return res.status(400).json({ success: false, message: 'Patient email is required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const patient = await User.findOne({ email: patientEmail.toLowerCase(), role: 'elderly' });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Elderly patient not found' });
      }

      if (patient.caregiverId && patient.caregiverId.toString() === req.user.id) {
        return res.status(400).json({ success: false, message: 'Patient is already linked to you' });
      }

      patient.caregiverId = req.user.id;
      await patient.save();

      return res.json({
        success: true,
        message: `Successfully linked patient ${patient.name}`,
        patient: {
          id: patient._id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        }
      });
    } else {
      // --- Mock-DB Logic ---
      const emailLower = patientEmail.toLowerCase();
      const patient = mockDb.users.find(u => u.email === emailLower && u.role === 'elderly');
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Elderly patient with this email not found (Mock-DB)' });
      }

      if (patient.caregiverId === req.user.id) {
        return res.status(400).json({ success: false, message: 'Patient is already linked to you (Mock-DB)' });
      }

      patient.caregiverId = req.user.id;
      return res.json({
        success: true,
        message: `Successfully linked patient ${patient.name} (Mock-DB)`,
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error linking patient', error: error.message });
  }
};

exports.unlinkPatient = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const { patientId } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const patient = await User.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      if (patient.caregiverId && patient.caregiverId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      patient.caregiverId = null;
      await patient.save();

      return res.json({ success: true, message: 'Patient unlinked successfully' });
    } else {
      // --- Mock-DB Logic ---
      const patient = mockDb.users.find(u => u.id === patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found (Mock-DB)' });
      }

      if (patient.caregiverId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
      }

      patient.caregiverId = null;
      return res.json({ success: true, message: 'Patient unlinked successfully (Mock-DB)' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error unlinking patient', error: error.message });
  }
};

exports.getPatientsOverview = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    const todayStr = new Date().toISOString().split('T')[0];
    const overview = [];

    if (isDbConnected) {
      const patients = await User.find({ caregiverId: req.user.id }).select('-password');
      
      for (const patient of patients) {
        const todayLogs = await ReminderLog.find({ userId: patient._id, date: todayStr });
        const total = todayLogs.length;
        const taken = todayLogs.filter(l => l.status === 'taken').length;
        const missed = todayLogs.filter(l => l.status === 'missed').length;
        const pending = todayLogs.filter(l => l.status === 'pending').length;

        // Fetch patient's active alerts
        const alerts = await CaregiverAlert.find({ patientId: patient._id, resolved: false }).sort({ createdAt: -1 });

        overview.push({
          patient: {
            id: patient._id,
            name: patient.name,
            email: patient.email,
            phone: patient.phone,
            emergencyContactName: patient.emergencyContactName,
            emergencyContactPhone: patient.emergencyContactPhone,
            emergencyContacts: patient.emergencyContacts || []
          },
          todayStats: { total, taken, missed, pending },
          activeSOS: false,
          activeSOSId: null,
          activeSOSLocation: null,
          activeAlerts: alerts
        });
      }
      return res.json({ success: true, overview });
    } else {
      // --- Mock-DB Logic ---
      const patients = mockDb.users.filter(u => u.caregiverId === req.user.id);
      
      for (const patient of patients) {
        const todayLogs = mockDb.reminderLogs.filter(l => l.userId === patient.id && l.date === todayStr);
        const total = todayLogs.length;
        const taken = todayLogs.filter(l => l.status === 'taken').length;
        const missed = todayLogs.filter(l => l.status === 'missed').length;
        const pending = todayLogs.filter(l => l.status === 'pending').length;

        // Fetch patient's active alerts
        const alerts = mockDb.caregiverAlerts.filter(a => a.patientId === patient.id && !a.resolved);

        overview.push({
          patient: {
            id: patient.id,
            name: patient.name,
            email: patient.email,
            phone: patient.phone,
            emergencyContactName: patient.emergencyContactName,
            emergencyContactPhone: patient.emergencyContactPhone,
            emergencyContacts: patient.emergencyContacts || []
          },
          todayStats: { total, taken, missed, pending },
          activeSOS: false,
          activeSOSId: null,
          activeSOSLocation: null,
          activeAlerts: alerts
        });
      }
      return res.json({ success: true, overview });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error getting patients overview', error: error.message });
  }
};

exports.getCaregiverAlerts = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const alerts = await CaregiverAlert.find({ caregiverId: req.user.id, resolved: false })
        .sort({ createdAt: -1 });
      return res.json({ success: true, alerts });
    } else {
      const alerts = mockDb.caregiverAlerts
        .filter(a => a.caregiverId === req.user.id && !a.resolved)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ success: true, alerts });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving caregiver alerts', error: error.message });
  }
};

exports.resolveCaregiverAlert = async (req, res) => {
  try {
    if (req.user.role !== 'caregiver') {
      return res.status(403).json({ success: false, message: 'Access denied: Caregiver role required' });
    }

    const { alertId } = req.body;
    if (!alertId) {
      return res.status(400).json({ success: false, message: 'alertId is required' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const alert = await CaregiverAlert.findById(alertId);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }
      if (alert.caregiverId.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
      alert.resolved = true;
      await alert.save();
      return res.json({ success: true, message: 'Alert resolved successfully' });
    } else {
      const alert = mockDb.caregiverAlerts.find(a => (a.id === alertId || a._id === alertId));
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found (Mock-DB)' });
      }
      if (alert.caregiverId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
      }
      alert.resolved = true;
      return res.json({ success: true, message: 'Alert resolved successfully (Mock-DB)' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error resolving alert', error: error.message });
  }
};
