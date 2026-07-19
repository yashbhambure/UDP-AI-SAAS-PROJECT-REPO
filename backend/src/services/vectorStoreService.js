const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { Document } = require('@langchain/core/documents');
const { getEmbeddingModel } = require('./embeddingService');
const logger = require('../utils/logger');

const COLLECTION_NAME = 'tickit_ai_document_chunks';
const CHROMA_URL = process.env.VECTOR_DB_URL || 'http://localhost:8000';

/**
 * Returns a LangChain Chroma vectorstore instance connected to the shared collection.
 * A new instance is created per call (lightweight — no persistent connection state).
 */
const getVectorStore = () => new Chroma(getEmbeddingModel(), {
  collectionName: COLLECTION_NAME,
  url: CHROMA_URL,
});

/**
 * Upsert text chunks and their embeddings into the ChromaDB collection via LangChain.
 * Maintains the same metadata schema { documentId, userId, title, text } and
 * deterministic IDs (documentId_index) as before, preserving user-isolation filtering.
 *
 * @param {string} documentId  - MongoDB Document ID
 * @param {string} userId      - MongoDB User ID
 * @param {string} title       - Document title (used in citation)
 * @param {string[]} chunks    - Extracted text chunks
 * @param {number[][]} embeddings - Pre-computed embeddings (one per chunk)
 */
const upsertChunks = async (documentId, userId, title, chunks, embeddings) => {
  if (chunks.length === 0) {
    logger.warn(`[vectorStoreService] No chunks to upsert for document ${documentId}`);
    return;
  }

  logger.info(`[vectorStoreService] Upserting ${chunks.length} chunks for document: ${documentId}`);

  const ids = [];
  const docs = [];

  for (let i = 0; i < chunks.length; i++) {
    ids.push(`${documentId}_${i}`);
    docs.push(new Document({
      pageContent: chunks[i],
      metadata: {
        documentId: documentId.toString(),
        userId: userId.toString(),
        title,
        text: chunks[i], // Redundant storage for convenience in query results
      },
    }));
  }

  try {
    const vectorStore = getVectorStore();
    // addDocuments with explicit ids ensures idempotent upsert behaviour (same id = overwrite)
    await vectorStore.addDocuments(docs, { ids });
    logger.info(`[vectorStoreService] Successfully indexed ${chunks.length} chunks for document ${documentId} in ChromaDB.`);
  } catch (err) {
    logger.error(`[vectorStoreService] Upsert failed for document ${documentId}: ${err.message}`);
    throw err;
  }
};

/**
 * Searches ChromaDB for text chunks similar to the query, isolated to the authenticated user.
 * Uses the pre-computed queryEmbedding vector directly to avoid a redundant embedding call.
 *
 * Return shape is identical to the previous raw ChromaDB implementation:
 *   [{ id, distance, metadata: { documentId, userId, title, text }, document }]
 *
 * @param {string} userId           - The current user's MongoDB ID (for isolation filter)
 * @param {number[]} queryEmbedding - Pre-computed 384-dim query vector
 * @param {number} [limit=5]        - Max number of chunks to return
 * @returns {Promise<object[]>}
 */
const similaritySearch = async (userId, queryEmbedding, limit = 5) => {
  logger.info(`[vectorStoreService] Running similarity search for user ${userId}`);

  try {
    const vectorStore = getVectorStore();

    // similaritySearchVectorWithScore accepts a pre-computed vector — no re-embedding
    // The filter object maps directly to ChromaDB's `where` clause for user isolation
    const results = await vectorStore.similaritySearchVectorWithScore(
      queryEmbedding,
      limit,
      { userId: userId.toString() }
    );

    // Map LangChain [Document, score][] → our established { id, distance, metadata, document } shape
    const formatted = results.map(([doc, score]) => ({
      id: doc.id ?? null,
      distance: score,
      metadata: doc.metadata,        // { documentId, userId, title, text }
      document: doc.pageContent,     // the raw chunk text
    }));

    logger.debug(`[vectorStoreService] Similarity search returned ${formatted.length} results.`);
    return formatted;
  } catch (err) {
    logger.error(`[vectorStoreService] Similarity search failed: ${err.message}`);
    throw err;
  }
};

module.exports = {
  upsertChunks,
  similaritySearch,
};
