const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema(
  {
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    opportunityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    remindAt: {
      type: Date,
      required: true,
      index: true,
    },
    channel: {
      type: String,
      enum: ['in-app', 'email'],
      default: 'in-app',
    },
    // Flipped to true once the notification has been dispatched
    sent: {
      type: Boolean,
      default: false,
      index: true,
    },
    // Flipped to false when the parent task is marked done or opportunity completed
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Human-readable label, e.g. "7 days before deadline"
    label: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for the cron worker's hot query
reminderSchema.index({ active: 1, sent: 1, remindAt: 1 });

module.exports = mongoose.model('Reminder', reminderSchema);
