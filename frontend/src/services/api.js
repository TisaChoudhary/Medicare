import axios from 'axios';

// Base URL points to the backend server.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token if stored
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('medicare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    return res.data;
  },
  signup: async (userData) => {
    const res = await api.post('/auth/signup', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
  updatePreferences: async (preferences) => {
    const res = await api.put('/auth/preferences', preferences);
    return res.data;
  },
};

export const medicineAPI = {
  getAll: async (patientId = null) => {
    const params = patientId ? { patientId } : {};
    const res = await api.get('/medicines', { params });
    return res.data;
  },
  getById: async (id) => {
    const res = await api.get(`/medicines/${id}`);
    return res.data;
  },
  create: async (medicineData) => {
    const res = await api.post('/medicines', medicineData);
    return res.data;
  },
  update: async (id, medicineData) => {
    const res = await api.put(`/medicines/${id}`, medicineData);
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/medicines/${id}`);
    return res.data;
  },
};

export const reminderAPI = {
  getToday: async (dateStr, patientId = null) => {
    const params = { date: dateStr };
    if (patientId) params.patientId = patientId;
    const res = await api.get('/reminders/today', { params });
    return res.data;
  },
  updateStatus: async (logId, status) => {
    const res = await api.put(`/reminders/status/${logId}`, { status });
    return res.data;
  },
  getHistory: async (patientId = null, startDate = null, endDate = null) => {
    const params = {};
    if (patientId) params.patientId = patientId;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const res = await api.get('/reminders/history', { params });
    return res.data;
  },
  getSummary: async (patientId = null) => {
    const params = patientId ? { patientId } : {};
    const res = await api.get('/reminders/summary', { params });
    return res.data;
  },
};

export const caregiverAPI = {
  getPatients: async () => {
    const res = await api.get('/caregiver/patients');
    return res.data;
  },
  linkPatient: async (patientEmail) => {
    const res = await api.post('/caregiver/link', { patientEmail });
    return res.data;
  },
  unlinkPatient: async (patientId) => {
    const res = await api.post('/caregiver/unlink', { patientId });
    return res.data;
  },
  getOverview: async () => {
    const res = await api.get('/caregiver/overview');
    return res.data;
  },
};

export const sosAPI = {
  trigger: async (latitude = null, longitude = null) => {
    const res = await api.post('/sos/trigger', { latitude, longitude });
    return res.data;
  },
  getActive: async () => {
    const res = await api.get('/sos/active');
    return res.data;
  },
  resolve: async (alertId) => {
    const res = await api.put(`/sos/resolve/${alertId}`);
    return res.data;
  },
};

export const aiAPI = {
  getAnalysis: async () => {
    const res = await api.get('/ai/analysis');
    return res.data;
  },
  chat: async (question) => {
    const res = await api.post('/ai/chat', { question });
    return res.data;
  },
};

export const reportAPI = {
  analyze: async (text, fileName) => {
    const res = await api.post('/reports/analyze', { text, fileName });
    return res.data;
  },
  save: async (reportData) => {
    const res = await api.post('/reports/save', reportData);
    return res.data;
  },
  getAll: async () => {
    const res = await api.get('/reports');
    return res.data;
  },
};

export default api;
