const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, enum: ['user', 'ai'], required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    metadata: {
      confidence: { type: Number, default: null },
      responseTime: { type: Number, default: null },
      tokenCount: { type: Number, default: null },
      model: { type: String, default: null },
      lastUpdated: { type: Date, default: null }
    },
    sourceChunks: [
      {
        id: { type: String },
        title: { type: String },
        text: { type: String },
        relevanceScore: { type: Number, default: null },
        chunkNum: { type: Number, default: null },
        keywords: [{ type: String }]
      }
    ],
    sourceOpportunities: [
      {
        id: { type: String },
        title: { type: String },
        deadline: { type: Date },
        status: { type: String },
        progress: { type: Number, default: null },
        healthScore: { type: Number, default: null }
      }
    ],
    summary: { type: String, default: '' },
    recommendations: [{ type: String }],
    suggestedActions: [{ type: String }]
  },
  { _id: false }
);

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    title: {
      type: String,
      trim: true,
      default: 'New Thread'
    },
    isPinned: {
      type: Boolean,
      default: false,
      index: true
    },
    isArchived: {
      type: Boolean,
      default: false,
      index: true
    },
    model: {
      type: String,
      default: 'gpt-5.5'
    },
    searchMode: {
      type: String,
      default: 'ask_ai'
    },
    messages: {
      type: [messageSchema],
      default: []
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Conversation', conversationSchema);
