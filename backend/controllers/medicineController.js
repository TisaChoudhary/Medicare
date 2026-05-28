const Medicine = require('../models/Medicine');
const User = require('../models/User');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

exports.createMedicine = async (req, res) => {
  try {
    const { name, dosage, frequency, timings, beforeAfterFood, stock, stockAlertThreshold, userId, prescriptionFile, prescriptionFileName } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    let targetUserId = req.user.id;

    if (isDbConnected) {
      if (req.user.role === 'caregiver') {
        if (!userId) {
          return res.status(400).json({ success: false, message: 'Patient userId must be specified' });
        }
        const patient = await User.findById(userId);
        if (!patient || patient.caregiverId.toString() !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied: Patient is not linked to you' });
        }
        targetUserId = userId;
      }

      const medicine = new Medicine({
        userId: targetUserId,
        name,
        dosage,
        frequency,
        timings,
        beforeAfterFood,
        stock: stock !== undefined ? stock : 30,
        stockAlertThreshold: stockAlertThreshold !== undefined ? stockAlertThreshold : 5,
        prescriptionFile: prescriptionFile || null,
        prescriptionFileName: prescriptionFileName || null
      });

      await medicine.save();
      return res.status(201).json({ success: true, medicine });
    } else {
      // --- Mock-DB Logic ---
      if (req.user.role === 'caregiver') {
        if (!userId) {
          return res.status(400).json({ success: false, message: 'Patient userId must be specified (Mock-DB)' });
        }
        const patient = mockDb.users.find(u => u.id === userId);
        if (!patient || patient.caregiverId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'Access denied: Patient is not linked (Mock-DB)' });
        }
        targetUserId = userId;
      }

      const mockMedId = 'mock_med_' + Math.random().toString(36).substr(2, 9);
      const newMed = {
        id: mockMedId,
        _id: mockMedId,
        userId: targetUserId,
        name,
        dosage,
        frequency,
        timings,
        beforeAfterFood,
        stock: stock !== undefined ? Number(stock) : 30,
        stockAlertThreshold: stockAlertThreshold !== undefined ? Number(stockAlertThreshold) : 5,
        prescriptionFile: prescriptionFile || null,
        prescriptionFileName: prescriptionFileName || null,
        active: true,
        createdAt: new Date()
      };

      mockDb.medicines.push(newMed);
      return res.status(201).json({ success: true, medicine: newMed });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating medicine', error: error.message });
  }
};

exports.getMedicines = async (req, res) => {
  try {
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

      const medicines = await Medicine.find({ userId: targetUserId, active: true });
      return res.json({ success: true, medicines });
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

      const medicines = mockDb.medicines.filter(m => m.userId === targetUserId && m.active === true);
      return res.json({ success: true, medicines });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error retrieving medicines', error: error.message });
  }
};

exports.getMedicineById = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      if (medicine.userId.toString() !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = await User.findById(medicine.userId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      return res.json({ success: true, medicine });
    } else {
      // --- Mock-DB Logic ---
      const medicine = mockDb.medicines.find(m => m.id === req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found (Mock-DB)' });
      }

      if (medicine.userId !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = mockDb.users.find(u => u.id === medicine.userId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
        }
      }

      return res.json({ success: true, medicine });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching medicine details', error: error.message });
  }
};

exports.updateMedicine = async (req, res) => {
  try {
    const { name, dosage, frequency, timings, beforeAfterFood, stock, stockAlertThreshold, active, prescriptionFile, prescriptionFileName } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      let medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      if (medicine.userId.toString() !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = await User.findById(medicine.userId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      if (name) medicine.name = name;
      if (dosage) medicine.dosage = dosage;
      if (frequency) medicine.frequency = frequency;
      if (timings) medicine.timings = timings;
      if (beforeAfterFood) medicine.beforeAfterFood = beforeAfterFood;
      if (stock !== undefined) medicine.stock = stock;
      if (stockAlertThreshold !== undefined) medicine.stockAlertThreshold = stockAlertThreshold;
      if (active !== undefined) medicine.active = active;
      if (prescriptionFile !== undefined) medicine.prescriptionFile = prescriptionFile;
      if (prescriptionFileName !== undefined) medicine.prescriptionFileName = prescriptionFileName;

      await medicine.save();
      return res.json({ success: true, medicine });
    } else {
      // --- Mock-DB Logic ---
      const medicine = mockDb.medicines.find(m => m.id === req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found (Mock-DB)' });
      }

      if (medicine.userId !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = mockDb.users.find(u => u.id === medicine.userId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
        }
      }

      if (name) medicine.name = name;
      if (dosage) medicine.dosage = dosage;
      if (frequency) medicine.frequency = frequency;
      if (timings) medicine.timings = timings;
      if (beforeAfterFood) medicine.beforeAfterFood = beforeAfterFood;
      if (stock !== undefined) medicine.stock = Number(stock);
      if (stockAlertThreshold !== undefined) medicine.stockAlertThreshold = Number(stockAlertThreshold);
      if (active !== undefined) medicine.active = active;
      if (prescriptionFile !== undefined) medicine.prescriptionFile = prescriptionFile;
      if (prescriptionFileName !== undefined) medicine.prescriptionFileName = prescriptionFileName;

      return res.json({ success: true, medicine });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating medicine', error: error.message });
  }
};

exports.deleteMedicine = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const medicine = await Medicine.findById(req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      if (medicine.userId.toString() !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = await User.findById(medicine.userId);
          if (!patient || patient.caregiverId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied' });
        }
      }

      medicine.active = false;
      await medicine.save();
      return res.json({ success: true, message: 'Medicine deleted successfully' });
    } else {
      // --- Mock-DB Logic ---
      const medicine = mockDb.medicines.find(m => m.id === req.params.id);
      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found (Mock-DB)' });
      }

      if (medicine.userId !== req.user.id) {
        if (req.user.role === 'caregiver') {
          const patient = mockDb.users.find(u => u.id === medicine.userId);
          if (!patient || patient.caregiverId !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
          }
        } else {
          return res.status(403).json({ success: false, message: 'Access denied (Mock-DB)' });
        }
      }

      medicine.active = false;
      return res.json({ success: true, message: 'Medicine deleted successfully (Mock-DB)' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error deleting medicine', error: error.message });
  }
};
