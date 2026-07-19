const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Opportunity = require('../models/Opportunity');
const Task = require('../models/Task');
const ChecklistItem = require('../models/ChecklistItem');
const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to protect all opportunity endpoints
router.use(authMiddleware);

/**
 * @route   GET /api/opportunities
 * @desc    List all opportunities for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const opportunities = await Opportunity.find({ userId: req.user._id })
      .sort({ createdAt: -1 });

    return res.json(opportunities);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/opportunities/:id
 * @desc    Get opportunity detail with its related tasks and checklist items
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const opportunity = await Opportunity.findOne({ _id: id, userId: req.user._id });
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    const [tasks, checklistItems] = await Promise.all([
      Task.find({ opportunityId: id, userId: req.user._id }).sort({ createdAt: 1 }),
      ChecklistItem.find({ opportunityId: id, userId: req.user._id }).sort({ createdAt: 1 }),
    ]);

    return res.json({
      opportunity,
      tasks,
      checklistItems,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /api/opportunities/:id/status
 * @desc    Update an opportunity's status and trigger cascades if completed
 * @access  Private
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'archived'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const opportunity = await Opportunity.findOne({ _id: id, userId: req.user._id });
    if (!opportunity) {
      return res.status(404).json({ error: 'Opportunity not found' });
    }

    opportunity.status = status;
    await opportunity.save();

    logger.info(`[Opportunities Route] Opportunity ${id} status updated to: "${status}" by user ${req.user._id}`);

    // Cascade logic: If opportunity is completed, complete all tasks and deactivate all reminders
    if (status === 'completed') {
      logger.info(`[Opportunities Route] Cascade: Completing all tasks and deactivating all reminders for opportunity ${id}`);
      
      await Task.updateMany(
        { opportunityId: id, userId: req.user._id, status: { $ne: 'done' } },
        { status: 'done' }
      );

      await Reminder.updateMany(
        { opportunityId: id, userId: req.user._id, active: true },
        { active: false }
      );
    }

    return res.json(opportunity);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
