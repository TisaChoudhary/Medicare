// Shared In-Memory Database for testing when MongoDB is disconnected
const mockDb = {
  users: [],
  medicines: [],
  reminderLogs: [],
  emergencyAlerts: [],
  medicalReports: []
};

module.exports = mockDb;
