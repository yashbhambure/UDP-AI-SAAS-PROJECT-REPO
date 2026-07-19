const crypto = require('crypto');

/**
 * hashContent — returns a SHA-256 hex digest of the given buffer or string.
 * Used for duplicate document detection.
 * @param {Buffer|string} content
 * @returns {string} hex hash
 */
const hashContent = (content) => {
  return crypto.createHash('sha256').update(content).digest('hex');
};

module.exports = { hashContent };
