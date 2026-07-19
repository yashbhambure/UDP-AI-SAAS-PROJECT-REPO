const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const ChecklistItem = require('../models/ChecklistItem');
const logger = require('../utils/logger');

const router = express.Router();

// Apply auth middleware to protect all checklist item routes
router.use(authMiddleware);

/**
 * @route   PATCH /api/checklist-items/:id/status
 * @desc    Update a checklist item's checked status
 * @access  Private
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { checked } = req.body;

    if (checked === undefined || typeof checked !== 'boolean') {
      return res.status(400).json({ error: 'checked status is required and must be a boolean.' });
    }

    const checklistItem = await ChecklistItem.findOne({ _id: id, userId: req.user._id });
    if (!checklistItem) {
      return res.status(404).json({ error: 'Checklist item not found.' });
    }

    checklistItem.checked = checked;
    await checklistItem.save();

    logger.info(`[Checklist Items Route] Checklist item ${id} checked status updated to: ${checked} by user ${req.user._id}`);

    return res.json(checklistItem);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
