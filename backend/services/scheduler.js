const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');
const ReminderLog = require('../models/ReminderLog');
const User = require('../models/User');
const Medicine = require('../models/Medicine');
const CaregiverAlert = require('../models/CaregiverAlert');
const jwt = require('jsonwebtoken');

// Firebase Admin SDK integration (Optional/Credential check fallback)
let firebaseMessaging = null;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    firebaseMessaging = admin.messaging();
    console.log('Firebase Admin SDK initialized successfully.');
  }
} catch (err) {
  console.warn('Firebase Admin SDK failed to initialize (Service Account Key missing or invalid):', err.message);
}

// Push notification sender helper
const sendPushNotification = async (fcmToken, payload) => {
  if (!fcmToken) return false;
  
  if (firebaseMessaging) {
    try {
      await firebaseMessaging.send({
        token: fcmToken,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {}
      });
      console.log(`FCM Push successfully sent to token: ${fcmToken.substr(0, 10)}...`);
      return true;
    } catch (err) {
      console.error('FCM Push failed to send:', err.message);
      return false;
    }
  } else {
    console.log(`[MOCK FCM PUSH] Sent to token ${fcmToken.substr(0, 10)}... - Title: "${payload.title}" - Body: "${payload.body}"`);
    return true;
  }
};

// Main check function run every minute
const checkReminders = async () => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;
    const now = new Date();
    
    // Get YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0];
    
    // Get HH:MM
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    if (isDbConnected) {
      // --- MongoDB Mode ---
      // 1. Fetch pending reminders due now that haven't been alerted
      const dueLogs = await ReminderLog.find({
        date: todayStr,
        time: timeStr,
        status: 'pending',
        notificationStatus: 'none'
      }).populate('medicineId userId');

      for (const log of dueLogs) {
        if (!log.userId || !log.medicineId) continue;
        
        const fcmToken = log.userId.fcmToken;
        const actionToken = jwt.sign(
          { logId: log._id.toString(), purpose: 'reminder_action' },
          process.env.JWT_SECRET || 'medicare_default_secret',
          { expiresIn: '1d' }
        );
        const payload = {
          title: '💊 Medicine Reminder',
          body: `Time to take ${log.medicineId.name} - Dosage: ${log.medicineId.dosage} (${log.time})`,
          data: {
            logId: log._id.toString(),
            actionToken,
            medicineName: log.medicineId.name,
            dosage: log.medicineId.dosage,
            time: log.time
          }
        };

        const success = await sendPushNotification(fcmToken, payload);
        log.notificationStatus = success ? 'sent' : 'failed';
        log.lastNotificationSentAt = new Date();
        await log.save();
      }

      // 2. Process Ignored Reminders (15 min retry loops)
      const fifteenMinsAgo = new Date(now.getTime() - 15 * 60 * 1000);
      const activeAlerts = await ReminderLog.find({
        status: 'pending',
        notificationStatus: 'sent',
        lastNotificationSentAt: { $lte: fifteenMinsAgo }
      }).populate('medicineId userId');

      for (const log of activeAlerts) {
        if (!log.userId || !log.medicineId) continue;

        if (log.retryCount < 3) {
          // Increment and resend alert
          log.retryCount += 1;
          log.lastNotificationSentAt = new Date();
          
          const fcmToken = log.userId.fcmToken;
          const actionToken = jwt.sign(
            { logId: log._id.toString(), purpose: 'reminder_action' },
            process.env.JWT_SECRET || 'medicare_default_secret',
            { expiresIn: '1d' }
          );
          const payload = {
            title: `⚠️ Medicine Alert (Attempt ${log.retryCount + 1})`,
            body: `Gentle reminder: Please take your ${log.medicineId.name} - Dosage: ${log.medicineId.dosage}.`,
            data: {
              logId: log._id.toString(),
              actionToken,
              medicineName: log.medicineId.name,
              dosage: log.medicineId.dosage,
              time: log.time
            }
          };

          await sendPushNotification(fcmToken, payload);
          await log.save();
        } else {
          // Mark as missed & notify caregiver
          log.status = 'missed';
          await log.save();

          const patient = log.userId;
          if (patient.caregiverId) {
            const caregiverAlert = new CaregiverAlert({
              caregiverId: patient.caregiverId,
              patientId: patient._id,
              patientName: patient.name,
              medicineName: log.medicineId.name,
              dosage: log.medicineId.dosage,
              scheduledTime: log.time,
              date: log.date
            });
            await caregiverAlert.save();
            console.log(`Caregiver Alert generated for patient ${patient.name} missing ${log.medicineId.name}`);
          }
        }
      }
    } else {
      // --- Mock DB Mode ---
      // 1. Fetch pending reminders due now that haven't been alerted
      const dueLogs = mockDb.reminderLogs.filter(l => 
        l.date === todayStr &&
        l.time === timeStr &&
        l.status === 'pending' &&
        l.notificationStatus === 'none'
      );

      for (const log of dueLogs) {
        const patient = mockDb.users.find(u => u.id === log.userId);
        const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
        if (!patient || !medicine) continue;

        const fcmToken = patient.fcmToken;
        const actionToken = jwt.sign(
          { logId: log.id, purpose: 'reminder_action' },
          process.env.JWT_SECRET || 'medicare_default_secret',
          { expiresIn: '1d' }
        );
        const payload = {
          title: '💊 Medicine Reminder',
          body: `Time to take ${medicine.name} - Dosage: ${medicine.dosage} (${log.time})`,
          data: {
            logId: log.id,
            actionToken,
            medicineName: medicine.name,
            dosage: medicine.dosage,
            time: log.time
          }
        };

        const success = await sendPushNotification(fcmToken, payload);
        log.notificationStatus = success ? 'sent' : 'failed';
        log.lastNotificationSentAt = new Date();
      }

      // 2. Process Ignored Reminders (15 min retry loops)
      const fifteenMinsAgo = now.getTime() - 15 * 60 * 1000;
      const activeAlerts = mockDb.reminderLogs.filter(l => 
        l.status === 'pending' &&
        l.notificationStatus === 'sent' &&
        l.lastNotificationSentAt && 
        new Date(l.lastNotificationSentAt).getTime() <= fifteenMinsAgo
      );

      for (const log of activeAlerts) {
        const patient = mockDb.users.find(u => u.id === log.userId);
        const medicine = mockDb.medicines.find(m => m.id === log.medicineId);
        if (!patient || !medicine) continue;

        if (log.retryCount < 3) {
          log.retryCount += 1;
          log.lastNotificationSentAt = new Date();

          const fcmToken = patient.fcmToken;
          const actionToken = jwt.sign(
            { logId: log.id, purpose: 'reminder_action' },
            process.env.JWT_SECRET || 'medicare_default_secret',
            { expiresIn: '1d' }
          );
          const payload = {
            title: `⚠️ Medicine Alert (Attempt ${log.retryCount + 1})`,
            body: `Gentle reminder: Please take your ${medicine.name} - Dosage: ${medicine.dosage}.`,
            data: {
              logId: log.id,
              actionToken,
              medicineName: medicine.name,
              dosage: medicine.dosage,
              time: log.time
            }
          };

          await sendPushNotification(fcmToken, payload);
        } else {
          log.status = 'missed';
          
          if (patient.caregiverId) {
            const mockAlertId = 'mock_alert_' + Math.random().toString(36).substr(2, 9);
            mockDb.caregiverAlerts.push({
              id: mockAlertId,
              _id: mockAlertId,
              caregiverId: patient.caregiverId,
              patientId: patient.id,
              patientName: patient.name,
              medicineName: medicine.name,
              dosage: medicine.dosage,
              scheduledTime: log.time,
              date: log.date,
              resolved: false,
              createdAt: new Date()
            });
            console.log(`Caregiver Alert generated (Mock-DB) for patient ${patient.name} missing ${medicine.name}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('Error in checkReminders scheduler loop:', err.message);
  }
};

// Scheduler setup
let intervalId = null;
const startScheduler = () => {
  if (intervalId) return;
  // Run check every 60 seconds
  intervalId = setInterval(checkReminders, 60000);
  console.log('Background Medicine Reminder Notification Scheduler started.');
  // Run an initial check after 5 seconds to bootstrap
  setTimeout(checkReminders, 5000);
};

const stopScheduler = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Background Medicine Reminder Notification Scheduler stopped.');
  }
};

module.exports = {
  startScheduler,
  stopScheduler,
  checkReminders // exposed for manual trigger in dev
};
