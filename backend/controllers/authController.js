const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

// Helper to sign JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || 'medicare_default_secret', {
    expiresIn: '30d'
  });
};

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, phone, caregiverEmail, emergencyContactName, emergencyContactPhone, emergencyContacts } = req.body;

    // Check if MongoDB is connected (1 = connected)
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      // --- MongoDB Logic ---
      let user = await User.findOne({ email });
      if (user) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let caregiverId = null;
      if (role === 'elderly' && caregiverEmail) {
        const caregiver = await User.findOne({ email: caregiverEmail, role: 'caregiver' });
        if (caregiver) {
          caregiverId = caregiver._id;
        }
      }

      const contactsList = Array.isArray(emergencyContacts)
        ? emergencyContacts
        : (emergencyContactName && emergencyContactPhone ? [{ name: emergencyContactName, phone: emergencyContactPhone }] : []);

      user = new User({
        name,
        email,
        password: hashedPassword,
        role: role || 'elderly',
        phone,
        caregiverId,
        emergencyContactName: emergencyContactName || (contactsList[0]?.name || ''),
        emergencyContactPhone: emergencyContactPhone || (contactsList[0]?.phone || ''),
        emergencyContacts: contactsList,
        voiceAssistantActive: true
      });

      await user.save();
      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          caregiverId: user.caregiverId,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          emergencyContacts: user.emergencyContacts || [],
          language: user.language,
          theme: user.theme,
          voiceAssistantActive: user.voiceAssistantActive
        }
      });
    } else {
      // --- Mock-DB Logic ---
      console.log('Running Auth/Signup in Mock-DB Mode (MongoDB offline)');
      const emailLower = email.toLowerCase();
      
      const exists = mockDb.users.some(u => u.email === emailLower);
      if (exists) {
        return res.status(400).json({ success: false, message: 'User already exists with this email (Mock-DB)' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      let caregiverId = null;
      if (role === 'elderly' && caregiverEmail) {
        const caregiver = mockDb.users.find(u => u.email === caregiverEmail.toLowerCase() && u.role === 'caregiver');
        if (caregiver) {
          caregiverId = caregiver.id;
        }
      }

      const contactsList = Array.isArray(emergencyContacts)
        ? emergencyContacts
        : (emergencyContactName && emergencyContactPhone ? [{ name: emergencyContactName, phone: emergencyContactPhone }] : []);

      const mockUserId = 'mock_user_' + Math.random().toString(36).substr(2, 9);
      const newUser = {
        id: mockUserId,
        _id: mockUserId, // double mapping for compatibility
        name,
        email: emailLower,
        password: hashedPassword,
        role: role || 'elderly',
        phone,
        caregiverId,
        emergencyContactName: emergencyContactName || (contactsList[0]?.name || ''),
        emergencyContactPhone: emergencyContactPhone || (contactsList[0]?.phone || ''),
        emergencyContacts: contactsList,
        language: 'en',
        theme: 'light',
        voiceAssistantActive: true,
        createdAt: new Date()
      };

      mockDb.users.push(newUser);
      const token = generateToken(mockUserId);

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          phone: newUser.phone,
          caregiverId: newUser.caregiverId,
          emergencyContactName: newUser.emergencyContactName,
          emergencyContactPhone: newUser.emergencyContactPhone,
          emergencyContacts: newUser.emergencyContacts || [],
          language: newUser.language,
          theme: newUser.theme,
          voiceAssistantActive: newUser.voiceAssistantActive
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during signup', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      // --- MongoDB Logic ---
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials' });
      }

      const token = generateToken(user._id);
      return res.json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          caregiverId: user.caregiverId,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          emergencyContacts: user.emergencyContacts || [],
          language: user.language,
          theme: user.theme,
          voiceAssistantActive: user.voiceAssistantActive
        }
      });
    } else {
      // --- Mock-DB Logic ---
      console.log('Running Auth/Login in Mock-DB Mode (MongoDB offline)');
      const emailLower = email.toLowerCase();
      const user = mockDb.users.find(u => u.email === emailLower);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid credentials (Mock-DB)' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Invalid credentials (Mock-DB)' });
      }

      const token = generateToken(user.id);
      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          caregiverId: user.caregiverId,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          emergencyContacts: user.emergencyContacts || [],
          language: user.language,
          theme: user.theme,
          voiceAssistantActive: user.voiceAssistantActive === undefined ? true : user.voiceAssistantActive
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const user = await User.findById(req.user.id).select('-password');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.json({ success: true, user });
    } else {
      const user = mockDb.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found (Mock-DB)' });
      }
      // clone and strip password
      const cleanUser = { ...user };
      delete cleanUser.password;
      return res.json({ success: true, user: cleanUser });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching user details', error: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { language, theme, phone, emergencyContactName, emergencyContactPhone, caregiverEmail, voiceAssistantActive, emergencyContacts } = req.body;
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (language) user.language = language;
      if (theme) user.theme = theme;
      if (phone) user.phone = phone;
      if (emergencyContactName) user.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone) user.emergencyContactPhone = emergencyContactPhone;
      if (voiceAssistantActive !== undefined) user.voiceAssistantActive = voiceAssistantActive;
      if (Array.isArray(emergencyContacts)) {
        user.emergencyContacts = emergencyContacts;
        user.emergencyContactName = emergencyContacts[0]?.name || '';
        user.emergencyContactPhone = emergencyContacts[0]?.phone || '';
      }

      if (user.role === 'elderly' && caregiverEmail) {
        const caregiver = await User.findOne({ email: caregiverEmail, role: 'caregiver' });
        if (caregiver) {
          user.caregiverId = caregiver._id;
        } else {
          return res.status(400).json({ success: false, message: 'Caregiver with this email not found' });
        }
      }

      await user.save();
      return res.json({
        success: true,
        message: 'Preferences updated successfully',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          caregiverId: user.caregiverId,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          emergencyContacts: user.emergencyContacts || [],
          language: user.language,
          theme: user.theme,
          voiceAssistantActive: user.voiceAssistantActive
        }
      });
    } else {
      // --- Mock-DB Logic ---
      const user = mockDb.users.find(u => u.id === req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found (Mock-DB)' });
      }

      if (language) user.language = language;
      if (theme) user.theme = theme;
      if (phone) user.phone = phone;
      if (emergencyContactName) user.emergencyContactName = emergencyContactName;
      if (emergencyContactPhone) user.emergencyContactPhone = emergencyContactPhone;
      if (voiceAssistantActive !== undefined) user.voiceAssistantActive = voiceAssistantActive;
      if (Array.isArray(emergencyContacts)) {
        user.emergencyContacts = emergencyContacts;
        user.emergencyContactName = emergencyContacts[0]?.name || '';
        user.emergencyContactPhone = emergencyContacts[0]?.phone || '';
      }

      if (user.role === 'elderly' && caregiverEmail) {
        const caregiver = mockDb.users.find(u => u.email === caregiverEmail.toLowerCase() && u.role === 'caregiver');
        if (caregiver) {
          user.caregiverId = caregiver.id;
        } else {
          return res.status(400).json({ success: false, message: 'Caregiver with this email not found (Mock-DB)' });
        }
      }

      return res.json({
        success: true,
        message: 'Preferences updated successfully (Mock-DB)',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          caregiverId: user.caregiverId,
          emergencyContactName: user.emergencyContactName,
          emergencyContactPhone: user.emergencyContactPhone,
          emergencyContacts: user.emergencyContacts || [],
          language: user.language,
          theme: user.theme,
          voiceAssistantActive: user.voiceAssistantActive
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error updating preferences', error: error.message });
  }
};
