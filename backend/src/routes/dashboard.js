const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Opportunity = require('../models/Opportunity');
const Task = require('../models/Task');
const Reminder = require('../models/Reminder');
const { callLLM } = require('../services/llmService');
const { buildInsightsPrompt } = require('../../prompts/insightsPrompt');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to protect all dashboard routes
router.use(authMiddleware);

/**
 * @route   GET /api/dashboard/summary
 * @desc    Get aggregated dashboard stats and AI insights
 * @access  Private
 */
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // 1. Fetch counts
    const [
      totalOpps,
      completedOpps,
      pendingOpps,
      inProgressOpps,
      tasksDueNext7Days,
      highPriorityTasks,
      upcomingReminders48h
    ] = await Promise.all([
      Opportunity.countDocuments({ userId }),
      Opportunity.countDocuments({ userId, status: 'completed' }),
      Opportunity.countDocuments({ userId, status: 'pending' }),
      Opportunity.countDocuments({ userId, status: 'in_progress' }),
      Task.countDocuments({
        userId,
        status: 'todo',
        dueDate: { $gte: now, $lte: sevenDaysLater }
      }),
      Task.countDocuments({
        userId,
        status: 'todo',
        priority: 'high'
      }),
      Reminder.countDocuments({
        userId,
        active: true,
        sent: false,
        remindAt: { $gte: now, $lte: fortyEightHoursLater }
      })
    ]);

    // 2. Fetch data snapshot for AI Insights
    const [activeOpps, activeTasks] = await Promise.all([
      Opportunity.find({ userId, status: { $in: ['pending', 'in_progress'] } }).sort({ deadline: 1 }).limit(10),
      Task.find({ userId, status: 'todo' }).sort({ dueDate: 1 }).limit(10)
    ]);

    // 3. Call Gemini for AI Insights with a rate-limit safe fallback
    let insights = '';
    if (activeOpps.length > 0 || activeTasks.length > 0) {
      try {
        logger.info(`[Dashboard Summary] Requesting AI Insights for user: ${userId}`);
        const { systemPrompt, userPrompt } = buildInsightsPrompt(activeOpps, activeTasks);
        
        const response = await callLLM({
          prompt: userPrompt,
          systemPrompt,
          expectJSON: false,
          promptName: 'insights'
        });
        
        insights = response.trim();
      } catch (err) {
        logger.error(`[Dashboard Summary] LLM call failed for AI insights: ${err.message}`);
        // Fallback message to prevent API crash when quota is exceeded
        insights = 'AI insights are currently unavailable due to system limit constraints. Please review your active high-priority tasks and upcoming deadlines manually.';
      }
    } else {
      insights = 'You have no active tasks or pending opportunities. Ingest a document to get started!';
    }

    return res.json({
      opportunities: {
        total: totalOpps,
        completed: completedOpps,
        pending: pendingOpps,
        inProgress: inProgressOpps
      },
      tasksDueNext7Days,
      highPriorityTasks,
      upcomingReminders48h,
      insights
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
