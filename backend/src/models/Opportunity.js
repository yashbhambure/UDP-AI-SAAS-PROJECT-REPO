const mongoose = require('mongoose');

const importantDateSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    date: { type: Date, default: null },
  },
  { _id: false }
);

const opportunitySchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    importantDates: {
      type: [importantDateSchema],
      default: [],
    },
    deadline: {
      type: Date,
      default: null,
      index: true,
    },
    requiredDocuments: {
      type: [String],
      default: [],
    },
    // Raw action items from LLM — used to seed Tasks
    actionItems: {
      type: [String],
      default: [],
    },
    suggestedAssignee: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'archived'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Opportunity', opportunitySchema);
