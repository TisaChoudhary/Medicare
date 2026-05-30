const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'mock_db_data.json');

// Initialize base data structure
let rawData = {
  users: [],
  medicines: [],
  reminderLogs: [],
  emergencyAlerts: [],
  medicalReports: []
};

// Load existing data if file exists
if (fs.existsSync(DB_FILE)) {
  try {
    rawData = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('Loaded mock DB data from persistent file.');
  } catch (e) {
    console.error('Error reading mock DB file:', e.message);
  }
}

// Function to save mock DB synchronously
const saveDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(rawData, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving mock DB file:', e.message);
  }
};

// Helper function to create deep proxies for tracking mutations
const makeProxy = (obj) => {
  return new Proxy(obj, {
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === 'object' && val !== null) {
        return makeProxy(val);
      }
      return val;
    },
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver);
      saveDb();
      return res;
    },
    defineProperty(target, prop, descriptor) {
      const res = Reflect.defineProperty(target, prop, descriptor);
      saveDb();
      return res;
    },
    deleteProperty(target, prop) {
      const res = Reflect.deleteProperty(target, prop);
      saveDb();
      return res;
    }
  });
};

const mockDb = makeProxy(rawData);

module.exports = mockDb;

