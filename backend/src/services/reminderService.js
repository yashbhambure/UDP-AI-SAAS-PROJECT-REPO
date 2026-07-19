const Reminder = require('../models/Reminder');
const logger = require('../utils/logger');

/**
 * Parses the REMINDER_DAYS_BEFORE environment variable.
 * @returns {number[]} Array of integers representing days before deadline to remind
 */
const getReminderDays = () => {
  const raw = process.env.REMINDER_DAYS_BEFORE || '7,2,0';
  return raw
    .split(',')
    .map((val) => parseInt(val.trim(), 10))
    .filter((val) => !isNaN(val));
};

/**
 * Computes and schedules future reminders for a specific task based on its dueDate.
 * Cleans up existing reminders for this task first.
 *
 * If the deadline is so close (or already past) that every calculated remindAt
 * falls in the past, a single immediate reminder (due in 1 minute) is created
 * so notification dispatch is never silently skipped.
 *
 * @param {object} task - The mongoose Task document
 * @returns {Promise<object[]>} Created reminder documents
 */
const scheduleRemindersForTask = async (task) => {
  const { _id: taskId, opportunityId, userId, dueDate } = task;

  logger.info(`[reminderService] Scheduling reminders for task: ${taskId}`);

  // Maintain idempotency: delete any existing reminders for this task
  await Reminder.deleteMany({ taskId, userId });

  if (!dueDate) {
    logger.debug(`[reminderService] Task ${taskId} has no due date. Skipping reminder scheduling.`);
    return [];
  }

  const daysBeforeList = getReminderDays();
  const remindersToCreate = [];
  const now = new Date();
  let skippedCount = 0;

  for (const daysBefore of daysBeforeList) {
    // Calculate remindAt timestamp
    const remindTimeMs = new Date(dueDate).getTime() - daysBefore * 24 * 60 * 60 * 1000;
    const remindAt = new Date(remindTimeMs);

    // Skip creating any remindAt that's already in the past
    if (remindAt <= now) {
      logger.debug(
        `[reminderService] Skipping ${daysBefore}d reminder for task ${taskId}: ` +
        `remindAt (${remindAt.toISOString()}) is in the past.`
      );
      skippedCount++;
      continue;
    }

    remindersToCreate.push({
      taskId,
      opportunityId,
      userId,
      remindAt,
      channel: 'in-app',
      sent: false,
      active: true,
      label: daysBefore === 0 ? 'Due today' : `${daysBefore} days before deadline`,
    });
  }

  // ── Fallback: if ALL computed remindAt times were in the past (e.g. same-day
  // or past deadline), create one immediate reminder due in 1 minute so the
  // notification worker can still fire a dispatch for this task.
  if (remindersToCreate.length === 0 && skippedCount > 0) {
    const immediateRemindAt = new Date(now.getTime() + 60 * 1000); // now + 1 min
    logger.warn(
      `[reminderService] All computed remindAt timestamps were in the past for task ${taskId} ` +
      `(deadline: ${new Date(dueDate).toISOString()}). Creating immediate fallback reminder ` +
      `at ${immediateRemindAt.toISOString()}.`
    );
    remindersToCreate.push({
      taskId,
      opportunityId,
      userId,
      remindAt: immediateRemindAt,
      channel: 'in-app',
      sent: false,
      active: true,
      label: 'Due today',
    });
  }

  if (remindersToCreate.length > 0) {
    const created = await Reminder.insertMany(remindersToCreate);
    logger.info(`[reminderService] Successfully scheduled ${created.length} reminders for task ${taskId}.`);
    return created;
  }

  return [];
};

module.exports = { scheduleRemindersForTask };
