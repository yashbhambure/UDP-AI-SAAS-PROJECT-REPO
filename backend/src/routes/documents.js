const express = require('express');
const upload = require('../middleware/uploadMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { processDocument } = require('../services/extractionService');
const Document = require('../models/Document');
const Opportunity = require('../models/Opportunity');
const logger = require('../utils/logger');

const router = express.Router();

// Apply authentication middleware to all document routes
router.use(authMiddleware);

/**
 * @route   POST /api/documents/upload
 * @desc    Upload files (batch) or paste raw text, process text extraction and LLM ingestion
 * @access  Private
 */
router.post('/upload', upload.array('files', 10), async (req, res, next) => {
  try {
    if (req.body.text) {
      // ── Pasted text path: single-item only (original single response format) ──
      const textContent = req.body.text.trim();
      if (textContent.length < 20) {
        return res.status(400).json({ error: 'Pasted text must be at least 20 characters long.' });
      }

      const fileBuffer = Buffer.from(textContent, 'utf-8');
      const mimetype = 'text/plain';
      const originalFilename = req.body.title
        ? `${req.body.title.trim()}.txt`
        : `Pasted Text - ${new Date().toISOString().slice(0, 10)}.txt`;

      logger.info(`[Documents Route] Starting single processing for pasted text "${originalFilename}"`);

      const result = await processDocument({
        fileBuffer,
        mimetype,
        originalFilename,
        userId: req.user._id,
      });

      if (result.isDuplicate) {
        return res.json({
          warning: 'This document has already been uploaded and processed.',
          document: result.document,
          opportunity: result.opportunity,
        });
      }

      return res.status(201).json({
        document: result.document,
        opportunity: result.opportunity,
      });
    }

    // ── Batch files path ──
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'Please upload at least one file or paste raw text.' });
    }

    const results = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filename = file.originalname;

      // Sequential delay helper to avoid Groq rate limit spikes
      if (i > 0) {
        logger.info(`[Documents Route] Sequential delay: waiting 1500ms before processing next file: "${filename}"`);
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      logger.info(`[Documents Route] Batch processing file ${i + 1}/${files.length}: "${filename}"`);

      try {
        const result = await processDocument({
          fileBuffer: file.buffer,
          mimetype: file.mimetype,
          originalFilename: filename,
          userId: req.user._id,
        });

        if (result.isDuplicate) {
          results.push({
            filename,
            status: 'duplicate',
            message: 'Already uploaded',
            title: result.opportunity ? result.opportunity.title : filename,
            opportunityId: result.opportunity ? result.opportunity._id : null,
          });
        } else {
          results.push({
            filename,
            status: 'success',
            title: result.opportunity ? result.opportunity.title : filename,
            opportunityId: result.opportunity ? result.opportunity._id : null,
          });
        }
      } catch (err) {
        logger.error(`[Documents Route] Failed to process batch file "${filename}": ${err.message}`);
        results.push({
          filename,
          status: 'failed',
          message: err.message,
        });
      }
    }

    return res.json({ results });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/documents
 * @desc    List all documents for the authenticated user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    return res.json(documents);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/documents/:id
 * @desc    Get document details with its linked opportunity
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const document = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const opportunity = await Opportunity.findOne({ documentId: document._id, userId: req.user._id });

    return res.json({
      document,
      opportunity,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/documents/:id/retry
 * @desc    Retry document extraction and processing for a failed document
 * @access  Private
 */
router.post('/:id/retry', async (req, res, next) => {
  try {
    const doc = await Document.findOne({ _id: req.params.id, userId: req.user._id });
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    if (doc.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed documents can be retried' });
    }

    doc.status = 'processing';
    doc.errorMessage = null;
    await doc.save();

    logger.info(`[Documents Route] Retrying document extraction for document ${doc._id}`);

    // Run processing inline so we can return the result
    try {
      const { buildExtractionPrompt } = require('../../prompts/extractionPrompt');
      const { callLLM } = require('../services/llmService');
      const { chunkText } = require('../services/chunkingService');
      const { getEmbeddings } = require('../services/embeddingService');
      const { upsertChunks } = require('../services/vectorStoreService');

      const { systemPrompt, userPrompt } = buildExtractionPrompt(doc.rawText);
      const extracted = await callLLM({
        prompt: userPrompt,
        systemPrompt,
        expectJSON: true,
        promptName: 'extraction',
      });

      const sanitiseExtraction = (extracted, originalFilename) => {
        const filenameBase = originalFilename
          ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
          : 'Untitled Document';
        const safeDate = (val) => {
          if (!val) return null;
          const d = new Date(val);
          return isNaN(d.getTime()) ? null : d;
        };
        return {
          title: (extracted.title || '').trim() || filenameBase,
          summary: (extracted.summary || '').trim(),
          importantDates: Array.isArray(extracted.importantDates)
            ? extracted.importantDates
                .filter((d) => d && d.label)
                .map((d) => ({ label: String(d.label), date: safeDate(d.date) }))
            : [],
          deadline: safeDate(extracted.deadline),
          requiredDocuments: Array.isArray(extracted.requiredDocuments)
            ? extracted.requiredDocuments.filter(Boolean).map(String)
            : [],
          actionItems: Array.isArray(extracted.actionItems)
            ? extracted.actionItems.filter(Boolean).map(String)
            : [],
          priority: ['low', 'medium', 'high'].includes(extracted.priority)
            ? extracted.priority
            : 'medium',
          category: (extracted.category || 'General').trim(),
          suggestedAssignee: (extracted.suggestedAssignee || '').trim(),
        };
      };

      const sanitised = sanitiseExtraction(extracted, doc.originalFilename);

      const opportunity = await Opportunity.create({
        documentId: doc._id,
        userId: req.user._id,
        title: sanitised.title,
        category: sanitised.category,
        priority: sanitised.priority,
        importantDates: sanitised.importantDates,
        deadline: sanitised.deadline,
        requiredDocuments: sanitised.requiredDocuments,
        actionItems: sanitised.actionItems,
        suggestedAssignee: sanitised.suggestedAssignee,
        status: 'pending',
      });

      // Generate Checklist Items, Tasks, and Reminders
      try {
        const { generateTasksAndChecklist } = require('../services/taskService');
        const { scheduleRemindersForTask } = require('../services/reminderService');

        const generationResult = await generateTasksAndChecklist(opportunity);
        for (const task of generationResult.tasks) {
          await scheduleRemindersForTask(task);
        }
      } catch (postErr) {
        logger.error(`[Documents Route] Post-processing tasks/reminders failed for retry: ${postErr.message}`);
      }

      // Chunk, embed, index in ChromaDB
      try {
        const chunks = chunkText(doc.rawText);
        const embeddings = await getEmbeddings(chunks);
        await upsertChunks(doc._id, req.user._id, sanitised.title, chunks, embeddings);
        doc.vectorId = 'tickit_ai_document_chunks';
      } catch (vectorErr) {
        logger.error(`[Documents Route] ChromaDB chunking/indexing failed for retry: ${vectorErr.message}`);
      }

      doc.title = sanitised.title;
      doc.summary = sanitised.summary;
      doc.extractedAt = new Date();
      doc.status = 'processed';
      await doc.save();

      logger.info(`[Documents Route] Extraction retry successful for document ${doc._id}`);
      return res.json({
        success: true,
        document: doc,
        opportunity,
      });

    } catch (err) {
      doc.status = 'failed';
      doc.errorMessage = err.message;
      await doc.save();
      logger.error(`[Documents Route] Retry extraction failed for doc ${doc._id}: ${err.message}`);
      return res.status(500).json({ error: `Extraction retry failed: ${err.message}` });
    }

  } catch (err) {
    next(err);
  }
});

module.exports = router;
