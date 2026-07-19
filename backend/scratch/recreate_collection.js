const { ChromaClient } = require('chromadb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const chromaUrl = process.env.VECTOR_DB_URL || 'http://localhost:8000';
console.log(`Connecting to ChromaDB at: ${chromaUrl}`);

const client = new ChromaClient({ path: chromaUrl });
const COLLECTION_NAME = 'tickit_ai_document_chunks';

async function run() {
  try {
    console.log(`Deleting collection: ${COLLECTION_NAME}...`);
    await client.deleteCollection({ name: COLLECTION_NAME });
    console.log('Collection deleted successfully.');
  } catch (err) {
    console.warn(`Could not delete collection (it might not exist yet): ${err.message}`);
  }

  try {
    console.log(`Creating collection: ${COLLECTION_NAME}...`);
    const collection = await client.getOrCreateCollection({ name: COLLECTION_NAME });
    console.log('Collection created successfully.');
  } catch (err) {
    console.error('Failed to create collection:', err);
  }
}

run();
