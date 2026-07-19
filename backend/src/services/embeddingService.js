const { Embeddings } = require('@langchain/core/embeddings');
const { pipeline } = require('@xenova/transformers');
const logger = require('../utils/logger');

// ── XenovaEmbeddings — LangChain-compatible wrapper around @xenova/transformers ──
// Subclasses LangChain's Embeddings base class so it can be passed directly to
// LangChain vectorstore constructors (e.g. Chroma) and used in LCEL chains.
// Internally uses the already-installed @xenova/transformers pipeline —
// same model (Xenova/all-MiniLM-L6-v2), same 384-dim output as before.
class XenovaEmbeddings extends Embeddings {
  constructor(params) {
    super(params ?? {});
    this.modelName = (params && params.modelName) || 'Xenova/all-MiniLM-L6-v2';
    this._extractor = null;
  }

  async _getExtractor() {
    if (!this._extractor) {
      logger.info(`[embeddingService] Initializing @xenova/transformers pipeline (${this.modelName}) via LangChain wrapper...`);
      this._extractor = await pipeline('feature-extraction', this.modelName);
    }
    return this._extractor;
  }

  /**
   * Embed a single query string. Called by LangChain on the search side.
   * @param {string} text
   * @returns {Promise<number[]>}
   */
  async embedQuery(text) {
    const extractor = await this._getExtractor();
    const output = await extractor(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }

  /**
   * Embed a batch of documents. Called by LangChain on the ingestion side.
   * Local model has no rate limits — process all in parallel for speed.
   * @param {string[]} texts
   * @returns {Promise<number[][]>}
   */
  async embedDocuments(texts) {
    const extractor = await this._getExtractor();
    const results = await Promise.all(
      texts.map(async (text) => {
        const output = await extractor(text, { pooling: 'mean', normalize: true });
        return Array.from(output.data);
      })
    );
    return results;
  }
}

// Lazy singleton — one shared instance across all calls
let _embeddingsInstance = null;

/**
 * Returns the shared XenovaEmbeddings (LangChain Embeddings) instance.
 * Exported for vectorStoreService to pass to the Chroma constructor.
 */
const getEmbeddingModel = () => {
  if (!_embeddingsInstance) {
    _embeddingsInstance = new XenovaEmbeddings({ modelName: 'Xenova/all-MiniLM-L6-v2' });
  }
  return _embeddingsInstance;
};

/**
 * Generates a 384-dimension vector embedding for a single text string.
 * Wraps LangChain's embedQuery() — identical output to the previous direct implementation.
 *
 * @param {string} text - The input text to embed
 * @returns {Promise<number[]>}
 */
const getEmbedding = async (text) => {
  try {
    return await getEmbeddingModel().embedQuery(text);
  } catch (err) {
    logger.error(`[embeddingService] Failed to generate embedding: ${err.message}`, err);
    throw err;
  }
};

/**
 * Generates embeddings for a batch of text strings via LangChain's embedDocuments().
 * Safe for local models — no external API rate limits.
 *
 * @param {string[]} texts - Array of text chunks to embed
 * @returns {Promise<number[][]>}
 */
const getEmbeddings = async (texts) => {
  try {
    return await getEmbeddingModel().embedDocuments(texts);
  } catch (err) {
    logger.error(`[embeddingService] Failed to generate batch embeddings: ${err.message}`, err);
    throw err;
  }
};

module.exports = {
  getEmbedding,
  getEmbeddings,
  getEmbeddingModel,
};
