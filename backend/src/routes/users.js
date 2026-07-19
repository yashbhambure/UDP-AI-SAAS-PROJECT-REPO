const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

// Protect all routes under /api/users
router.use(authMiddleware);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', async (req, res, next) => {
  try {
    return res.json(req.user);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /api/users/me
 * @desc    Update user profile (phoneNumber and notificationPreferences)
 * @access  Private
 */
router.patch('/me', async (req, res, next) => {
  try {
    const { phoneNumber, notificationPreferences } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (phoneNumber !== undefined) {
      // Validate E.164 format if phoneNumber is not empty
      if (phoneNumber.trim() !== '') {
        const e164Regex = /^\+[1-9]\d{1,14}$/;
        if (!e164Regex.test(phoneNumber.trim())) {
          return res.status(400).json({
            error: 'Phone number must be in E.164 format (e.g., +15551234567)'
          });
        }
      }
      user.phoneNumber = phoneNumber.trim();
    }

    if (notificationPreferences !== undefined) {
      if (notificationPreferences.email !== undefined) {
        user.notificationPreferences.email = !!notificationPreferences.email;
      }
      if (notificationPreferences.sms !== undefined) {
        user.notificationPreferences.sms = !!notificationPreferences.sms;
      }
      if (notificationPreferences.inApp !== undefined) {
        user.notificationPreferences.inApp = !!notificationPreferences.inApp;
      }
    }

    await user.save();
    logger.info(`[User Route] Profile updated for user: ${user._id}`);

    return res.json(user);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
