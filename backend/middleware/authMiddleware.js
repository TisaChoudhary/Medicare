const jwt = require('jsonwebtoken');
const User = require('../models/User');
const mongoose = require('mongoose');
const mockDb = require('../models/mockDb');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'medicare_default_secret');

      const isDbConnected = mongoose.connection.readyState === 1;

      if (isDbConnected) {
        req.user = await User.findById(decoded.id).select('-password');
      } else {
        // Fallback to Mock Db user search
        const user = mockDb.users.find(u => u.id === decoded.id);
        if (user) {
          req.user = {
            id: user.id,
            _id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            caregiverId: user.caregiverId,
            emergencyContactName: user.emergencyContactName,
            emergencyContactPhone: user.emergencyContactPhone,
            emergencyContacts: user.emergencyContacts || [],
            language: user.language,
            theme: user.theme
          };
        }
      }

      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
      }

      next();
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };
