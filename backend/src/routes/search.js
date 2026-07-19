const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const { getEmbedding } = require('../services/embeddingService');
const { similaritySearch } = require('../services/vectorStoreService');
const Opportunity = require('../models/Opportunity');
const SearchHistory = require('../models/SearchHistory');
const logger = require('../utils/logger');

// ── LangChain imports for RAG answer generation ────────────────────────────────
const { ChatGroq } = require('@langchain/groq');
const { ChatPromptTemplate } = require('@langchain/core/prompts');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { Document } = require('@langchain/core/documents');
const { RunnablePassthrough, RunnableSequence } = require('@langchain/core/runnables');

const router = express.Router();

// Apply auth middleware to protect search route
router.use(authMiddleware);

/**
 * @route   GET /api/search/history
 * @desc    Get user's search history (limit 20)
 * @access  Private
 */
router.get('/history', async (req, res, next) => {
  try {
    const history = await SearchHistory.find({ userId: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(20);
    return res.json(history);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/search/history
 * @desc    Clear all search history for the user
 * @access  Private
 */
router.delete('/history', async (req, res, next) => {
  try {
    await SearchHistory.deleteMany({ userId: req.user._id });
    logger.info(`[Search Route] Cleared search history for user ${req.user._id}`);
    return res.json({ success: true, message: 'All search history cleared' });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/search/history/:id
 * @desc    Delete a specific search history item (isolated to user)
 * @access  Private
 */
router.delete('/history/:id', async (req, res, next) => {
  try {
    const deleted = await SearchHistory.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Search history item not found or unauthorized' });
    }
    logger.info(`[Search Route] Deleted search history item ${req.params.id} for user ${req.user._id}`);
    return res.json({ success: true, message: 'Search history item deleted' });
  } catch (err) {
    next(err);
  }
});

// Lazy-initialized ChatGroq client (same model as before)
let _chatGroq = null;
const getChatGroq = () => {
  if (!_chatGroq) {
    if (!process.env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not set');
    _chatGroq = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.1,
    });
  }
  return _chatGroq;
};

/**
 * Formats an array of LangChain Documents into the context block string
 * that the RAG prompt expects.
 */
const formatDocuments = (docs) =>
  docs
    .map((doc, i) => {
      const title = doc.metadata?.title || 'Untitled Document';
      return `Chunk ${i + 1} (Source Document: "${title}"):\n"${doc.pageContent}"`;
    })
    .join('\n\n');

/**
 * @route   POST /api/search
 * @desc    Hybrid semantic search and structured query (RAG) — now using LangChain ChatGroq chain
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const trimmedQuery = query.trim();
    logger.info(`[Search Route] Executing hybrid query for user ${req.user._id}: "${trimmedQuery}"`);

    // ── 1. Unstructured Vector Retrieval ─────────────────────────────────────
    let searchResults = [];
    try {
      const queryEmbedding = await getEmbedding(trimmedQuery);
      searchResults = await similaritySearch(req.user._id, queryEmbedding, 5);
    } catch (vectorErr) {
      logger.error(`[Search Route] Vector search retrieval failed: ${vectorErr.message}`);
      // Continue without vector results — fallback to pure structured RAG
    }

    // ── 2. Structured Opportunity Database Retrieval (Date sorting helper) ────
    // Fetch upcoming opportunities sorted by deadline to answer deadline queries.
    // This MongoDB sort stays as-is — LangChain is not involved here.
    let nearestOpportunities = [];
    try {
      nearestOpportunities = await Opportunity.find({
        userId: req.user._id,
        deadline: { $ne: null },
      })
        .sort({ deadline: 1 })
        .limit(5);
    } catch (dbErr) {
      logger.error(`[Search Route] MongoDB opportunity retrieval failed: ${dbErr.message}`);
    }

    // ── 3. Build context strings ──────────────────────────────────────────────
    // Convert vector search results to LangChain Document objects for the chain
    const vectorDocs = searchResults.length > 0
      ? searchResults.map((chunk) => new Document({
          pageContent: chunk.document,
          metadata: chunk.metadata,
        }))
      : [];

    const unstructuredContext = vectorDocs.length > 0
      ? formatDocuments(vectorDocs)
      : 'No document chunks found.';

    const structuredContext = nearestOpportunities.length > 0
      ? nearestOpportunities
          .map((opp, index) => {
            const dateStr = opp.deadline ? new Date(opp.deadline).toISOString().slice(0, 10) : 'N/A';
            return `- Opportunity ${index + 1}: Title="${opp.title}", Category="${opp.category}", Deadline=${dateStr}, Priority="${opp.priority}", Status="${opp.status}"`;
          })
          .join('\n')
      : 'No opportunities with deadlines found in the database.';

    // ── 4. LangChain RAG chain: ChatGroq + ChatPromptTemplate + StringOutputParser
    // Preserves the exact same grounding rules and prompt intent as the previous callLLM path.
    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are Tick-It AI, a precision RAG assistant.
Your goal is to answer the user's query using ONLY the provided context blocks.
The context contains two parts:
1. Structured Opportunities Data (Upcoming Deadlines from DB)
2. Unstructured Document Chunks (Text from uploaded files)

Rules:
- Be factual and truthful. Do not assume or extrapolate.
- If the context does not contain enough information to answer the question, state: "I do not have enough information in the uploaded documents or database to answer this question."
- Always cite the source document titles for facts derived from unstructured document chunks (e.g. "According to the document '[Title]', ...").
- For queries asking about deadlines, nearest deadlines, or date order, rely on the Structured Opportunities Data.`,
      ],
      [
        'human',
        `=== CONTEXT ===
[STRUCTURED OPPORTUNITIES DATA]
{structuredContext}

[UNSTRUCTURED DOCUMENT CHUNKS]
{unstructuredContext}
===============

User Query: "{question}"

Grounded Answer:`,
      ],
    ]);

    const chain = RunnableSequence.from([
      RunnablePassthrough.assign({
        structuredContext: () => structuredContext,
        unstructuredContext: () => unstructuredContext,
      }),
      prompt,
      getChatGroq(),
      new StringOutputParser(),
    ]);

    const answer = await chain.invoke({ question: trimmedQuery });

    // Save search query to history with deduplication (move latest search to top)
    try {
      await SearchHistory.deleteOne({ userId: req.user._id, query: trimmedQuery });
      await SearchHistory.create({ userId: req.user._id, query: trimmedQuery });
    } catch (historyErr) {
      logger.error(`[Search Route] Saving search history failed: ${historyErr.message}`);
    }

    return res.json({
      answer: answer.trim(),
      sourceChunks: searchResults.map((chunk) => ({
        id: chunk.id,
        title: chunk.metadata.title,
        text: chunk.document,
      })),
      sourceOpportunities: nearestOpportunities.map((opp) => ({
        id: opp._id,
        title: opp.title,
        deadline: opp.deadline,
        status: opp.status,
      })),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
