const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Task = require('../models/Task');
const Opportunity = require('../models/Opportunity');
const Reminder = require('../models/Reminder');
const { scheduleRemindersForTask } = require('../services/reminderService');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to protect all task endpoints
router.use(authMiddleware);

/**
 * @route   GET /api/tasks
 * @desc    List tasks for the authenticated user (filterable)
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const { opportunityId, status, priority } = req.query;

    const filter = { userId: req.user._id };

    if (opportunityId) {
      filter.opportunityId = opportunityId;
    }
    if (status) {
      filter.status = status;
    }
    if (priority) {
      filter.priority = priority;
    }

    const tasks = await Task.find(filter).sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /api/tasks/:id/status
 * @desc    Update a task's status with status cascade and reminder management
 * @access  Private
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['todo', 'done'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const task = await Task.findOne({ _id: id, userId: req.user._id });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    logger.info(`[Tasks Route] Task ${id} status updated from "${oldStatus}" to "${status}" by user ${req.user._id}`);

    if (status === 'done') {
      // 1. Deactivate reminders associated with this task
      await Reminder.updateMany(
        { taskId: id, userId: req.user._id, active: true },
        { active: false }
      );
      logger.info(`[Tasks Route] Deactivated reminders for completed task ${id}`);

      // 2. Cascade: check if all tasks for the opportunity are now done
      const pendingTasksCount = await Task.countDocuments({
        opportunityId: task.opportunityId,
        userId: req.user._id,
        status: { $ne: 'done' }
      });

      if (pendingTasksCount === 0) {
        logger.info(`[Tasks Route] Cascade: All tasks completed. Auto-completing parent opportunity ${task.opportunityId}`);
        await Opportunity.updateOne(
          { _id: task.opportunityId, userId: req.user._id },
          { status: 'completed' }
        );
      }
    } else if (status === 'todo') {
      // 1. Re-schedule/re-activate future reminders
      logger.info(`[Tasks Route] Re-scheduling reminders for reopened task ${id}`);
      await scheduleRemindersForTask(task);

      // 2. Cascade: if opportunity was completed, revert it to in_progress
      const opportunity = await Opportunity.findOne({ _id: task.opportunityId, userId: req.user._id });
      if (opportunity && opportunity.status === 'completed') {
        logger.info(`[Tasks Route] Cascade: Task reopened. Reverting parent opportunity ${task.opportunityId} from "completed" to "in_progress"`);
        opportunity.status = 'in_progress';
        await opportunity.save();
      }
    }

    return res.json(task);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
