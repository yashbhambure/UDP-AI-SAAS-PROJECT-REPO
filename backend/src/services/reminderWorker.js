const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

let _resendInstance = null;
const getResend = () => {
  if (!_resendInstance && process.env.RESEND_API_KEY) {
    try {
      const { Resend } = require('resend');
      _resendInstance = new Resend(process.env.RESEND_API_KEY);
    } catch (err) {
      logger.error(`[Reminder Worker] Error loading resend package: ${err.message}`);
    }
  }
  return _resendInstance;
};

let _twilioInstance = null;
const getTwilio = () => {
  if (!_twilioInstance && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio');
      _twilioInstance = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    } catch (err) {
      logger.error(`[Reminder Worker] Error loading twilio package: ${err.message}`);
    }
  }
  return _twilioInstance;
};

/**
 * Scan database for outstanding reminders, dispatch in-app notifications,
 * and mark them as sent. Also deactivates reminders for tasks that are already done.
 *
 * @returns {Promise<number>} Number of notifications successfully dispatched
 */
const runReminderCheck = async () => {
  logger.info('[Reminder Worker] Running reminder check scan...');
  const now = new Date();

  try {
    // Find active, unsent reminders where remindAt is in the past or present
    const dueReminders = await Reminder.find({
      active: true,
      sent: false,
      remindAt: { $lte: now },
    }).populate('taskId').populate('userId');

    if (dueReminders.length === 0) {
      logger.info('[Reminder Worker] No pending reminders found.');
      return 0;
    }

    logger.info(`[Reminder Worker] Found ${dueReminders.length} pending reminders to process.`);
    let dispatchedCount = 0;

    for (const reminder of dueReminders) {
      // If task no longer exists, deactivate the reminder
      if (!reminder.taskId) {
        logger.warn(`[Reminder Worker] Reminder ${reminder._id} has no valid associated task. Deactivating.`);
        reminder.active = false;
        await reminder.save();
        continue;
      }

      // If task is already done, deactivate the reminder
      if (reminder.taskId.status === 'done') {
        logger.debug(`[Reminder Worker] Task ${reminder.taskId._id} is already completed. Deactivating reminder.`);
        reminder.active = false;
        await reminder.save();
        continue;
      }

      const user = reminder.userId;
      if (!user) {
        logger.warn(`[Reminder Worker] Reminder ${reminder._id} has no valid associated user. Deactivating.`);
        reminder.active = false;
        await reminder.save();
        continue;
      }

      const preferences = user.notificationPreferences || { email: false, sms: false, inApp: true };
      const labelText = reminder.label ? ` (${reminder.label})` : '';
      const message = `Reminder: "${reminder.taskId.title}" is due.${labelText}`;

      // 1. In-App Notification
      if (preferences.inApp) {
        await Notification.create({
          userId: user._id,
          message,
          read: false,
          relatedTaskId: reminder.taskId._id,
          relatedOpportunityId: reminder.opportunityId,
          type: 'reminder',
        });
        logger.info(`[Reminder Worker] Dispatched in-app notification for task ${reminder.taskId._id}`);
      }

      // 2. Email Notification (via Resend)
      if (preferences.email) {
        try {
          const resendClient = getResend();
          if (resendClient) {
            await resendClient.emails.send({
              from: 'onboarding@resend.dev',
              to: user.email,
              subject: `Reminder: "${reminder.taskId.title}" is due`,
              text: message,
            });
            logger.info(`[Reminder Worker] Dispatched email to ${user.email} for task ${reminder.taskId._id}`);
          } else {
            logger.warn('[Reminder Worker] Resend API key is missing. Skipping email notification.');
          }
        } catch (emailErr) {
          logger.error(`[Reminder Worker] Email delivery failed for user ${user._id}: ${emailErr.message}`);
        }
      }

      // 3. SMS Notification (via Twilio)
      if (preferences.sms) {
        if (user.phoneNumber) {
          try {
            const twilioClient = getTwilio();
            if (twilioClient && process.env.TWILIO_PHONE_NUMBER) {
              await twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: user.phoneNumber,
              });
              logger.info(`[Reminder Worker] Dispatched SMS to ${user.phoneNumber} for task ${reminder.taskId._id}`);
            } else {
              logger.warn('[Reminder Worker] Twilio credentials or phone number missing. Skipping SMS notification.');
            }
          } catch (smsErr) {
            logger.error(`[Reminder Worker] SMS delivery failed for user ${user._id}: ${smsErr.message}`);
          }
        } else {
          logger.warn(`[Reminder Worker] SMS enabled but no phone number configured for user ${user._id}`);
        }
      }

      // Mark reminder as sent
      reminder.sent = true;
      await reminder.save();
      dispatchedCount++;
    }

    logger.info(`[Reminder Worker] Finished scan. Dispatched ${dispatchedCount} notifications.`);
    return dispatchedCount;
  } catch (err) {
    logger.error(`[Reminder Worker] Scan failed: ${err.message}`, err);
    throw err;
  }
};

let _cronJob = null;

/**
 * Starts the recurring node-cron reminder worker.
 */
const startReminderWorker = () => {
  const cronExpression = process.env.REMINDER_CRON || '*/5 * * * *';
  logger.info(`[Reminder Worker] Initializing background reminder cron: "${cronExpression}"`);

  _cronJob = cron.schedule(cronExpression, async () => {
    try {
      await runReminderCheck();
    } catch (err) {
      logger.error(`[Reminder Worker] Cron check failed: ${err.message}`);
    }
  });
};

/**
 * Stops the background worker.
 */
const stopReminderWorker = () => {
  if (_cronJob) {
    _cronJob.stop();
    logger.info('[Reminder Worker] Background reminder worker stopped.');
  }
};

module.exports = {
  startReminderWorker,
  stopReminderWorker,
  runReminderCheck,
};
