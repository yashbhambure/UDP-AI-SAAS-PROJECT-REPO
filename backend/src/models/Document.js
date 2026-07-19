const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalFilename: {
      type: String,
      required: true,
      trim: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'docx', 'txt', 'image', 'text'],
      required: true,
    },
    rawText: {
      type: String,
      default: '',
    },
    // Guaranteed non-empty: falls back to originalFilename if LLM leaves it blank
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      default: '',
    },
    extractedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['processing', 'processed', 'failed'],
      default: 'processing',
      index: true,
    },
    // SHA-256 hash of raw file content — used for duplicate detection
    fileHash: {
      type: String,
      index: true,
    },
    // Pointer to the set of vectors in ChromaDB for this document
    vectorId: {
      type: String,
      default: null,
    },
    // Store extraction error message when status === 'failed'
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Document', documentSchema);
