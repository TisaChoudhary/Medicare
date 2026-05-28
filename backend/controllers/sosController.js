const EmergencyAlert = require('../models/EmergencyAlert');
const User = require('../models/User');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

exports.triggerSOS = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const userId = req.user.id;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      let alert = await EmergencyAlert.findOne({ userId, status: 'active' });

      if (!alert) {
        alert = new EmergencyAlert({
          userId,
          caregiverId: user.caregiverId,
          location: {
            latitude: latitude || null,
            longitude: longitude || null
          },
          status: 'active'
        });
        await alert.save();
      } else {
        if (latitude && longitude) {
          alert.location = { latitude, longitude };
          await alert.save();
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Emergency SOS alert triggered successfully. Caregiver notified.',
        alert
      });
    } else {
      // --- Mock-DB Logic ---
      const user = mockDb.users.find(u => u.id === userId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found (Mock-DB)' });
      }

      let alert = mockDb.emergencyAlerts.find(a => a.userId === userId && a.status === 'active');

      if (!alert) {
        const mockSOSId = 'mock_sos_' + Math.random().toString(36).substr(2, 9);
        alert = {
          id: mockSOSId,
          _id: mockSOSId,
          userId,
          caregiverId: user.caregiverId,
          location: {
            latitude: latitude || null,
            longitude: longitude || null
          },
          status: 'active',
          resolvedAt: null,
          createdAt: new Date()
        };
        mockDb.emergencyAlerts.push(alert);
      } else {
        if (latitude && longitude) {
          alert.location = { latitude, longitude };
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Emergency SOS alert triggered successfully (Mock-DB). Caregiver notified.',
        alert
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error triggering SOS', error: error.message });
  }
};

exports.getActiveAlerts = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      let query = { status: 'active' };
      if (req.user.role === 'caregiver') {
        query.caregiverId = req.user.id;
      } else {
        query.userId = req.user.id;
      }

      const alerts = await EmergencyAlert.find(query).populate('userId', 'name email phone emergencyContactName emergencyContactPhone');
      return res.json({ success: true, alerts });
    } else {
      // --- Mock-DB Logic ---
      let queryAlerts = mockDb.emergencyAlerts.filter(a => a.status === 'active');
      
      if (req.user.role === 'caregiver') {
        queryAlerts = queryAlerts.filter(a => a.caregiverId === req.user.id);
      } else {
        queryAlerts = queryAlerts.filter(a => a.userId === req.user.id);
      }

      const populatedAlerts = queryAlerts.map(alert => {
        const user = mockDb.users.find(u => u.id === alert.userId);
        return {
          ...alert,
          userId: user ? {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone
          } : null
        };
      });

      return res.json({ success: true, alerts: populatedAlerts });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving active alerts', error: error.message });
  }
};

exports.resolveSOS = async (req, res) => {
  try {
    const { alertId } = req.params;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const alert = await EmergencyAlert.findById(alertId);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'SOS Alert not found' });
      }

      if (alert.userId.toString() !== req.user.id && alert.caregiverId?.toString() !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      await alert.save();

      return res.json({ success: true, message: 'SOS alert resolved successfully', alert });
    } else {
      // --- Mock-DB Logic ---
      const alert = mockDb.emergencyAlerts.find(a => a.id === alertId);
      if (!alert) {
        return res.status(404).json({ success: false, message: 'SOS Alert not found (Mock-DB)' });
      }

      if (alert.userId !== req.user.id && alert.caregiverId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();

      return res.json({ success: true, message: 'SOS alert resolved successfully (Mock-DB)', alert });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error resolving SOS alert', error: error.message });
  }
};
