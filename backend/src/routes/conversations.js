const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Conversation = require('../models/Conversation');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to protect all conversations endpoints
router.use(authMiddleware);

/**
 * @route   GET /api/conversations
 * @desc    List all active conversations (not archived) for the user
 * @access  Private
 */
router.get('/', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user._id,
      isArchived: false
    }).sort({ isPinned: -1, updatedAt: -1 });

    return res.json(conversations);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/conversations/archived
 * @desc    List all archived conversations for the user
 * @access  Private
 */
router.get('/archived', async (req, res, next) => {
  try {
    const conversations = await Conversation.find({
      userId: req.user._id,
      isArchived: true
    }).sort({ updatedAt: -1 });

    return res.json(conversations);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/conversations
 * @desc    Create a new conversation thread
 * @access  Private
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, model, searchMode } = req.body;
    
    const conversation = new Conversation({
      userId: req.user._id,
      title: title || 'New Thread',
      model: model || 'gpt-5.5',
      searchMode: searchMode || 'ask_ai',
      messages: []
    });

    await conversation.save();
    logger.info(`[Conversations Route] Created conversation thread ${conversation._id} for user ${req.user._id}`);
    
    return res.status(201).json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Get specific conversation detail
 * @access  Private
 */
router.get('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   PATCH /api/conversations/:id
 * @desc    Update conversation fields (title, isPinned, isArchived, model, searchMode)
 * @access  Private
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { title, isPinned, isArchived, model, searchMode } = req.body;
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    if (title !== undefined) conversation.title = title;
    if (isPinned !== undefined) conversation.isPinned = isPinned;
    if (isArchived !== undefined) conversation.isArchived = isArchived;
    if (model !== undefined) conversation.model = model;
    if (searchMode !== undefined) conversation.searchMode = searchMode;

    await conversation.save();
    logger.info(`[Conversations Route] Updated conversation thread ${conversation._id} fields`);

    return res.json(conversation);
  } catch (err) {
    next(err);
  }
});

/**
 * @route   DELETE /api/conversations/:id
 * @desc    Delete a conversation thread permanently
 * @access  Private
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const conversation = await Conversation.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    logger.info(`[Conversations Route] Deleted conversation thread ${req.params.id} permanently`);
    return res.json({ success: true, message: 'Conversation deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/conversations/:id/messages
 * @desc    Add messages to a conversation thread
 * @access  Private
 */
router.post('/:id/messages', async (req, res, next) => {
  try {
    const { messages } = req.body; // Expecting array of message objects or a single message object
    
    if (!messages) {
      return res.status(400).json({ error: 'Messages are required' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const newMessages = Array.isArray(messages) ? messages : [messages];
    conversation.messages.push(...newMessages);
    await conversation.save();

    logger.info(`[Conversations Route] Appended ${newMessages.length} messages to conversation ${conversation._id}`);
    return res.json(conversation);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
