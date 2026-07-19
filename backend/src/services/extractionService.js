/**
 * extractionService.js — Orchestrates the full document processing pipeline.
 *
 * Pipeline:
 *   1. Hash the raw file buffer → check for duplicate in MongoDB
 *   2. Extract raw text (delegated to textExtractor)
 *   3. Create a Document record in MongoDB with status "processing"
 *   4. Call Gemini via llmService with the extraction prompt
 *   5. Validate + sanitise the JSON response (title fallback to filename)
 *   6. Create an Opportunity record linked to the Document
 *   7. Update Document with extracted title/summary/status "processed"
 *   8. On any failure: update Document to status "failed", re-throw
 */

const Document = require('../models/Document');
const Opportunity = require('../models/Opportunity');
const { callLLM, LLMError } = require('./llmService');
const { buildExtractionPrompt } = require('../../prompts/extractionPrompt');
const { hashContent } = require('../utils/fileHash');
const { extractText, detectFileType } = require('../utils/textExtractor');
const logger = require('../utils/logger');
const { chunkText } = require('./chunkingService');
const { getEmbeddings } = require('./embeddingService');
const { upsertChunks } = require('./vectorStoreService');

// ── Helper: parse an ISO date string safely ───────────────────────────────────
const safeDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

// ── Helper: validate and sanitise the LLM extraction result ──────────────────
const sanitiseExtraction = (extracted, originalFilename) => {
  // GUARANTEE: title is always non-empty — fallback to filename (without ext)
  const filenameBase = originalFilename
    ? originalFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ')
    : 'Untitled Document';

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

/**
 * processDocument — the main pipeline entry point.
 *
 * @param {object} params
 * @param {Buffer}  params.fileBuffer      - Raw file bytes from multer
 * @param {string}  params.mimetype        - MIME type
 * @param {string}  params.originalFilename
 * @param {string}  params.userId          - Authenticated user's ObjectId (string)
 * @returns {Promise<{ document, opportunity, isDuplicate }>}
 */
const processDocument = async ({ fileBuffer, mimetype, originalFilename, userId }) => {
  // ── Step 1: Duplicate detection ────────────────────────────────────────────
  const fileHash = hashContent(fileBuffer);
  const existing = await Document.findOne({ fileHash, userId });
  if (existing) {
    const existingOpp = await Opportunity.findOne({ documentId: existing._id });
    if (existing.status === 'processed' && existingOpp && existingOpp.title) {
      logger.warn(`[extractionService] Duplicate detected for user ${userId}: hash=${fileHash}`);
      return { document: existing, opportunity: existingOpp, isDuplicate: true };
    }

    // Clean up stale, failed, or incomplete records
    logger.info(`[extractionService] Found incomplete/failed duplicate document for user ${userId}: hash=${fileHash}. Cleaning up and reprocessing...`);
    if (existingOpp) {
      const Task = require('../models/Task');
      const ChecklistItem = require('../models/ChecklistItem');
      const Reminder = require('../models/Reminder');
      await Task.deleteMany({ opportunityId: existingOpp._id });
      await ChecklistItem.deleteMany({ opportunityId: existingOpp._id });
      await Reminder.deleteMany({ opportunityId: existingOpp._id });
      await Opportunity.deleteOne({ _id: existingOpp._id });
    }
    await Document.deleteOne({ _id: existing._id });
  }

  // ── Step 2: Extract raw text ───────────────────────────────────────────────
  const fileType = detectFileType(mimetype, originalFilename);
  let rawText;
  try {
    rawText = await extractText(fileBuffer, mimetype, originalFilename);
  } catch (err) {
    logger.error(`[extractionService] Text extraction failed: ${err.message}`);
    throw err;
  }

  if (!rawText || rawText.trim().length < 20) {
    throw new Error('Could not extract meaningful text from the uploaded file. Please try a different format.');
  }

  // ── Step 3: Create Document with status "processing" ──────────────────────
  const doc = await Document.create({
    userId,
    originalFilename,
    fileType,
    rawText,
    title: originalFilename, // temporary — will be overwritten after LLM step
    fileHash,
    status: 'processing',
  });

  logger.info(`[extractionService] Document created: ${doc._id}, starting LLM extraction`);

  try {
    // ── Step 4: Call LLM ─────────────────────────────────────────────────────
    const { systemPrompt, userPrompt } = buildExtractionPrompt(rawText);
    const extracted = await callLLM({
      prompt: userPrompt,
      systemPrompt,
      expectJSON: true,
      promptName: 'extraction',
    });

    // ── Step 5: Sanitise — guarantee non-empty title ──────────────────────────
    const sanitised = sanitiseExtraction(extracted, originalFilename);

    logger.debug(`[extractionService] Extracted title: "${sanitised.title}", priority: ${sanitised.priority}`);

    // ── Step 6: Create Opportunity ────────────────────────────────────────────
    const opportunity = await Opportunity.create({
      documentId: doc._id,
      userId,
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

    // ── Step 6.5: Generate Checklist Items, Tasks, and Reminders ───────────────
    let generatedTasks = [];
    let generatedChecklist = [];
    try {
      const { generateTasksAndChecklist } = require('./taskService');
      const { scheduleRemindersForTask } = require('./reminderService');

      const generationResult = await generateTasksAndChecklist(opportunity);
      generatedTasks = generationResult.tasks;
      generatedChecklist = generationResult.checklistItems;

      for (const task of generatedTasks) {
        await scheduleRemindersForTask(task);
      }
      logger.info(`[extractionService] Post-processing succeeded: ${generatedTasks.length} tasks and ${generatedChecklist.length} checklist items created.`);
    } catch (postErr) {
      logger.error(`[extractionService] Post-processing tasks/reminders failed: ${postErr.message}`, postErr);
    }

    // ── Step 6.6: Chunk, embed, and index in ChromaDB ─────────────────────────
    try {
      const chunks = chunkText(rawText);
      logger.info(`[extractionService] Segmented text into ${chunks.length} chunks. Generating embeddings in batch...`);

      // Batch embedding — safe for local model (no external API rate limits)
      const embeddings = await getEmbeddings(chunks);

      await upsertChunks(doc._id, userId, sanitised.title, chunks, embeddings);
      doc.vectorId = 'tickit_ai_document_chunks';
    } catch (vectorErr) {
      logger.error(`[extractionService] ChromaDB chunking/indexing failed: ${vectorErr.message}`, vectorErr);
    }

    // ── Step 7: Update Document with extraction results ───────────────────────
    doc.title = sanitised.title;
    doc.summary = sanitised.summary;
    doc.extractedAt = new Date();
    doc.status = 'processed';
    await doc.save();

    logger.info(`[extractionService] Processing complete: doc=${doc._id} opp=${opportunity._id}`);

    return { document: doc, opportunity, isDuplicate: false, tasks: generatedTasks, checklistItems: generatedChecklist };

  } catch (err) {
    // ── Step 8: Mark document as failed ──────────────────────────────────────
    doc.status = 'failed';
    doc.errorMessage = err.message;
    await doc.save();

    logger.error(`[extractionService] Processing failed for doc ${doc._id}: ${err.message}`);
    throw err;
  }
};

module.exports = { processDocument };
