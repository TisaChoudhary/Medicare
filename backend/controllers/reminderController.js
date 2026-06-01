const ReminderLog = require('../models/ReminderLog');
const Medicine = require('../models/Medicine');
const User = require('../models/User');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

// Mock helper to generate logs
const generateDailyLogsMock = (userId, dateStr) => {
  const activeMeds = mockDb.medicines.filter(m => m.userId === userId && m.active === true);
  
  activeMeds.forEach(med => {
    med.timings.forEach(time => {
      // Check if already logged
      const exists = mockDb.reminderLogs.some(l => 
        l.userId === userId && 
        l.medicineId === med.id && 
        l.date === dateStr && 
        l.time === time
      );

      if (!exists) {
        const mockLogId = 'mock_log_' + Math.random().toString(36).substr(2, 9);
        mockDb.reminderLogs.push({
          id: mockLogId,
          _id: mockLogId,
          userId,
          medicineId: med.id, // save ID as reference
          date: dateStr,
          time,
          status: 'pending',
          takenAt: null,
          snoozeCount: 0,
          updatedAt: new Date()
        });
      }
    });
  });
};

const generateDailyLogs = async (userId, dateStr) => {
  const medicines = await Medicine.find({ userId, active: true });
  for (const med of medicines) {
    for (const time of med.timings) {
      let log = await ReminderLog.findOne({
        userId,
        medicineId: med._id,
        date: dateStr,
        time: time
      });

      if (!log) {
        log = new ReminderLog({
          userId,
          medicineId: med._id,
          date: dateStr,
          time: time,
          status: 'pending'
        });
        await log.save();
      }
    }
  }
};

exports.getTodayReminders = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const isDbConnected = mongoose.connection.readyState === 1;

    let targetUserId = req.user.id;

    if (isDbConnected) {
      if (req.user.role === 'caregiver') {
        const { patientId } = req.query;
        if (patientId) {
          const patient = await User.findById(patientId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
          targetUserId = patientId;
        }
      }

      await generateDailyLogs(targetUserId, targetDate);

      const logs = await ReminderLog.find({ userId: targetUserId, date: targetDate })
        .populate('medicineId')
        .sort({ time: 1 });

      return res.json({ success: true, reminders: logs });
    } else {
      // --- Mock-DB Logic ---
      if (req.user.role === 'caregiver') {
        const { patientId } = req.query;
        if (patientId) {
          const patient = mockDb.users.find(u => u.id === patientId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
          targetUserId = patientId;
        }
      }

      generateDailyLogsMock(targetUserId, targetDate);

      // Fetch and manually emulate populate
      const logs = mockDb.reminderLogs
        .filter(l => l.userId === targetUserId && l.date === targetDate)
        .map(log => {
          const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
          return {
            ...log,
            medicineId: medicine || null
          };
        })
        .sort((a, b) => a.time.localeCompare(b.time));

      return res.json({ success: true, reminders: logs });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving reminders', error: error.message });
  }
};

exports.updateReminderStatus = async (req, res) => {
  try {
    const { logId } = req.params;
    const { status } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!['taken', 'missed', 'snoozed', 'pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    if (isDbConnected) {
      const log = await ReminderLog.findById(logId).populate('medicineId');
      if (!log) {
        return res.status(404).json({ success: false, message: 'Reminder log not found' });
      }

      if (log.userId.toString() !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = await User.findById(log.userId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      const oldStatus = log.status;
      log.status = status;
      log.updatedAt = new Date();

      if (status === 'taken') {
        log.takenAt = new Date();
        if (oldStatus !== 'taken' && log.medicineId) {
          const medicine = await Medicine.findById(log.medicineId._id);
          if (medicine && medicine.stock > 0) {
            medicine.stock = Math.max(0, medicine.stock - 1);
            await medicine.save();
          }
        }
      } else if (status === 'snoozed') {
        log.snoozeCount = (log.snoozeCount || 0) + 1;
      } else if (status === 'pending' || status === 'missed') {
        log.takenAt = null;
        if (oldStatus === 'taken' && log.medicineId) {
          const medicine = await Medicine.findById(log.medicineId._id);
          if (medicine) {
            medicine.stock += 1;
            await medicine.save();
          }
        }
      }

      await log.save();
      return res.json({ success: true, reminder: log });
    } else {
      // --- Mock-DB Logic ---
      const log = mockDb.reminderLogs.find(l => l.id === logId);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Reminder log not found (Mock-DB)' });
      }

      if (log.userId !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = mockDb.users.find(u => u.id === log.userId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
        }
      }

      const oldStatus = log.status;
      log.status = status;
      log.updatedAt = new Date();

      const medicine = mockDb.medicines.find(m => m.id === log.medicineId);

      if (status === 'taken') {
        log.takenAt = new Date();
        if (oldStatus !== 'taken' && medicine) {
          if (medicine.stock > 0) {
            medicine.stock = Math.max(0, medicine.stock - 1);
          }
        }
      } else if (status === 'snoozed') {
        log.snoozeCount = (log.snoozeCount || 0) + 1;
      } else if (status === 'pending' || status === 'missed') {
        log.takenAt = null;
        if (oldStatus === 'taken' && medicine) {
          medicine.stock += 1;
        }
      }

      const populatedLog = {
        ...log,
        medicineId: medicine || null
      };

      return res.json({ success: true, reminder: populatedLog });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating status', error: error.message });
  }
};

exports.getReminderHistory = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let targetUserId = req.user.id;
    const { patientId, startDate, endDate } = req.query;

    if (req.user.role === 'caregiver') {
      if (!patientId) {
        return res.status(400).json({ success: false, message: 'patientId is required' });
      }
      if (isDbConnected) {
        const patient = await User.findById(patientId);
        if (!patient || patient.caregiverId.toString() !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      } else {
        const patient = mockDb.users.find(u => u.id === patientId);
        if (!patient || patient.caregiverId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
        }
      }
      targetUserId = patientId;
    }

    if (isDbConnected) {
      const query = { userId: targetUserId };
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = startDate;
        if (endDate) query.date.$lte = endDate;
      }

      const history = await ReminderLog.find(query)
        .populate('medicineId')
        .sort({ date: -1, time: -1 })
        .limit(100);

      return res.json({ success: true, history });
    } else {
      // --- Mock-DB Logic ---
      let history = mockDb.reminderLogs.filter(l => l.userId === targetUserId);
      if (startDate) history = history.filter(l => l.date >= startDate);
      if (endDate) history = history.filter(l => l.date <= endDate);

      const populatedHistory = history
        .map(log => {
          const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
          return {
            ...log,
            medicineId: medicine || null
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
        .slice(0, 100);

      return res.json({ success: true, history: populatedHistory });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving history', error: error.message });
  }
};

exports.getHealthSummary = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    let targetUserId = req.user.id;
    const { patientId } = req.query;

    if (req.user.role === 'caregiver') {
      if (patientId) {
        if (isDbConnected) {
          const patient = await User.findById(patientId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        } else {
          const patient = mockDb.users.find(u => u.id === patientId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
        }
        targetUserId = patientId;
      }
    }

    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];

    if (isDbConnected) {
      const logs = await ReminderLog.find({
        userId: targetUserId,
        date: { $gte: startDateStr }
      });

      const total = logs.length;
      const taken = logs.filter(l => l.status === 'taken').length;
      const missed = logs.filter(l => l.status === 'missed').length;
      const snoozed = logs.filter(l => l.status === 'snoozed').length;
      const pending = logs.filter(l => l.status === 'pending').length;

      const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

      const lowStockMedicines = await Medicine.find({
        userId: targetUserId,
        active: true,
        $expr: { $lte: ['$stock', '$stockAlertThreshold'] }
      });

      return res.json({
        success: true,
        summary: {
          totalReminders: total,
          takenReminders: taken,
          missedReminders: missed,
          snoozedReminders: snoozed,
          pendingReminders: pending,
          complianceRate,
          lowStockAlerts: lowStockMedicines.map(m => ({
            id: m._id,
            name: m.name,
            stock: m.stock,
            threshold: m.stockAlertThreshold
          }))
        }
      });
    } else {
      // --- Mock-DB Logic ---
      const logs = mockDb.reminderLogs.filter(l => l.userId === targetUserId && l.date >= startDateStr);
      const total = logs.length;
      const taken = logs.filter(l => l.status === 'taken').length;
      const missed = logs.filter(l => l.status === 'missed').length;
      const snoozed = logs.filter(l => l.status === 'snoozed').length;
      const pending = logs.filter(l => l.status === 'pending').length;

      const complianceRate = total > 0 ? Math.round((taken / total) * 100) : 100;

      const lowStockMedicines = mockDb.medicines.filter(m => 
        m.userId === targetUserId && 
        m.active === true && 
        m.stock <= m.stockAlertThreshold
      );

      return res.json({
        success: true,
        summary: {
          totalReminders: total,
          takenReminders: taken,
          missedReminders: missed,
          snoozedReminders: snoozed,
          pendingReminders: pending,
          complianceRate,
          lowStockAlerts: lowStockMedicines.map(m => ({
            id: m.id,
            name: m.name,
            stock: m.stock,
            threshold: m.stockAlertThreshold
          }))
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving health summary', error: error.message });
  }
};

exports.saveFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;
    if (isDbConnected) {
      await User.findByIdAndUpdate(req.user.id, { fcmToken });
    } else {
      const user = mockDb.users.find(u => u.id === req.user.id);
      if (user) user.fcmToken = fcmToken;
    }
    res.json({ success: true, message: 'FCM Token saved successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error saving token', error: err.message });
  }
};

exports.getNotifications = async (req, res) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const logs = await ReminderLog.find({
        userId: req.user.id,
        date: todayStr,
        status: 'pending',
        notificationStatus: 'sent'
      }).populate('medicineId');
      
      res.json({ success: true, notifications: logs });
    } else {
      const logs = mockDb.reminderLogs
        .filter(l => 
          l.userId === req.user.id && 
          l.date === todayStr && 
          l.status === 'pending' && 
          l.notificationStatus === 'sent'
        )
        .map(log => {
          const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
          return {
            ...log,
            medicineId: medicine || null
          };
        });
      res.json({ success: true, notifications: logs });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error retrieving notifications', error: err.message });
  }
};

exports.postReminderAction = async (req, res) => {
  try {
    const { logId, action } = req.body;
    if (!['taken', 'soze', 'snooze'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action' });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const log = await ReminderLog.findById(logId).populate('medicineId');
      if (!log) {
        return res.status(404).json({ success: false, message: 'Reminder log not found' });
      }

      if (action === 'taken') {
        const oldStatus = log.status;
        log.status = 'taken';
        log.takenAt = new Date();
        log.updatedAt = new Date();
        
        // Decrement medicine stock if it wasn't already taken
        if (oldStatus !== 'taken' && log.medicineId) {
          const medicine = await Medicine.findById(log.medicineId._id);
          if (medicine && medicine.stock > 0) {
            medicine.stock = Math.max(0, medicine.stock - 1);
            await medicine.save();
          }
        }
        await log.save();
      } else if (action === 'snooze') {
        log.status = 'snoozed';
        log.snoozeCount = (log.snoozeCount || 0) + 1;
        log.updatedAt = new Date();
        await log.save();

        // Schedule new reminder in 10 minutes
        const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
        const snoozeHours = snoozeTime.getHours().toString().padStart(2, '0');
        const snoozeMinutes = snoozeTime.getMinutes().toString().padStart(2, '0');
        const snoozeTimeStr = `${snoozeHours}:${snoozeMinutes}`;
        const todayStr = snoozeTime.toISOString().split('T')[0];

        const newLog = new ReminderLog({
          userId: log.userId,
          medicineId: log.medicineId._id,
          date: todayStr,
          time: snoozeTimeStr,
          status: 'pending',
          notificationStatus: 'none',
          retryCount: 0,
          lastNotificationSentAt: null
        });
        await newLog.save();
      }

      return res.json({ success: true, reminder: log });
    } else {
      // --- Mock-DB Mode ---
      const log = mockDb.reminderLogs.find(l => l.id === logId);
      if (!log) {
        return res.status(404).json({ success: false, message: 'Reminder log not found (Mock-DB)' });
      }

      const medicine = mockDb.medicines.find(m => m.id === log.medicineId);

      if (action === 'taken') {
        const oldStatus = log.status;
        log.status = 'taken';
        log.takenAt = new Date();
        log.updatedAt = new Date();

        if (oldStatus !== 'taken' && medicine) {
          if (medicine.stock > 0) {
            medicine.stock = Math.max(0, medicine.stock - 1);
          }
        }
      } else if (action === 'snooze') {
        log.status = 'snoozed';
        log.snoozeCount = (log.snoozeCount || 0) + 1;
        log.updatedAt = new Date();

        // Schedule new reminder in 10 minutes
        const snoozeTime = new Date(Date.now() + 10 * 60 * 1000);
        const snoozeHours = snoozeTime.getHours().toString().padStart(2, '0');
        const snoozeMinutes = snoozeTime.getMinutes().toString().padStart(2, '0');
        const snoozeTimeStr = `${snoozeHours}:${snoozeMinutes}`;
        const todayStr = snoozeTime.toISOString().split('T')[0];

        const mockLogId = 'mock_log_' + Math.random().toString(36).substr(2, 9);
        mockDb.reminderLogs.push({
          id: mockLogId,
          _id: mockLogId,
          userId: log.userId,
          medicineId: log.medicineId,
          date: todayStr,
          time: snoozeTimeStr,
          status: 'pending',
          notificationStatus: 'none',
          retryCount: 0,
          lastNotificationSentAt: null,
          snoozeCount: 0,
          updatedAt: new Date()
        });
      }

      const populatedLog = {
        ...log,
        medicineId: medicine || null
      };

      return res.json({ success: true, reminder: populatedLog });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error triggering action', error: err.message });
  }
};

exports.triggerSchedulerCheck = async (req, res) => {
  try {
    const { checkReminders } = require('../services/scheduler');
    await checkReminders();
    res.json({ success: true, message: 'Background reminder checks executed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to run scheduler check', error: err.message });
  }
};


