const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { runReminderCheck } = require('../services/reminderWorker');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication to protect reminder management endpoints
router.use(authMiddleware);

/**
 * @route   GET /api/reminders
 * @desc    List all reminders for the authenticated user, sorted by remindAt ascending
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const { active, sent } = req.query;
    const filter = { userId: req.user._id };

    if (active !== undefined) {
      filter.active = active === 'true';
    }
    if (sent !== undefined) {
      filter.sent = sent === 'true';
    }

    const reminders = await Reminder.find(filter)
      .sort({ remindAt: 1 });

    return res.json(reminders);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/reminders/run-now
 * @desc    Manually triggers the reminder worker scan and notification dispatch loop.
 *          Strictly restricted to NODE_ENV = development.
 * @access  Private
 */
router.post('/run-now', async (req, res, next) => {
  try {
    // Dev-only check
    if (process.env.NODE_ENV !== 'development') {
      logger.warn(`[Reminders Route] Blocked run-now execution request in non-development env (${process.env.NODE_ENV}).`);
      return res.status(403).json({
        error: 'Forbidden. The run-now endpoint is only available in development mode for testing.',
      });
    }

    logger.info(`[Reminders Route] Manual reminder run-now triggered by user: ${req.user._id}`);
    
    // Execute the scan loop synchronously for the dev testing response
    const dispatchedCount = await runReminderCheck();

    return res.json({
      success: true,
      message: `Successfully executed reminder worker loop.`,
      dispatchedCount,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
