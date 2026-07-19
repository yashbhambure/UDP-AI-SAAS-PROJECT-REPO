const logger = require('../utils/logger');

/**
 * Get the maximum number of chunks permitted per document from env,
 * defaulting to 100 to protect embedding quotas.
 */
const getChunkingLimit = () => {
  return parseInt(process.env.MAX_CHUNKS_PER_DOCUMENT || '100', 10);
};

/**
 * Splits text into chunks of character size with some overlap.
 * Enforces a strict cap on the maximum number of chunks.
 *
 * @param {string} text - The input document text
 * @param {object} [options]
 * @param {number} [options.chunkSize] - Character size threshold for each chunk (default: 1500)
 * @param {number} [options.chunkOverlap] - Character overlap between consecutive chunks (default: 200)
 * @param {number} [options.maxChunks] - Strict cap on generated chunks (defaults to env or 100)
 * @returns {string[]} Array of text chunks
 */
const chunkText = (text, options = {}) => {
  const maxChunks = options.maxChunks || getChunkingLimit();
  const chunkSize = options.chunkSize || 1500;
  const chunkOverlap = options.chunkOverlap || 200;

  if (!text || typeof text !== 'string') {
    return [];
  }

  const paragraphs = text.split(/\n+/);
  const chunks = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    // Check if adding this paragraph exceeds the target chunk size
    if ((currentChunk + '\n' + trimmed).length > chunkSize) {
      if (currentChunk) {
        if (chunks.length >= maxChunks) {
          logger.warn(`[chunkingService] Reached chunking cap of ${maxChunks} chunks. Truncating document.`);
          break;
        }
        chunks.push(currentChunk.trim());
        
        // Retain overlap from current chunk end
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        currentChunk = currentChunk.slice(overlapStart) + '\n' + trimmed;
      } else {
        // If a single paragraph is too large on its own, slice it directly
        let remaining = trimmed;
        while (remaining.length > 0) {
          if (chunks.length >= maxChunks) {
            logger.warn(`[chunkingService] Reached chunking cap of ${maxChunks} chunks. Truncating document.`);
            break;
          }
          chunks.push(remaining.slice(0, chunkSize).trim());
          
          remaining = remaining.slice(chunkSize - chunkOverlap);
          if (remaining.length <= chunkOverlap) {
            break; // Done with this oversized paragraph
          }
        }
        currentChunk = '';
      }
    } else {
      currentChunk = currentChunk ? currentChunk + '\n' + trimmed : trimmed;
    }

    if (chunks.length >= maxChunks) {
      break;
    }
  }

  // Push the final chunk if any space is left under the cap
  if (currentChunk && chunks.length < maxChunks) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

module.exports = { chunkText };
