require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./src/app');
const { ChromaClient } = require('chromadb');

const PORT = 5006;
const API_URL = `http://localhost:${PORT}`;

// 1. Mock the LLM and Embedding services to run without calling external API
const llmService = require('./src/services/llmService');

llmService.getEmbedding = async (text) => {
  return new Array(384).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
};

llmService.callLLM = async ({ prompt, systemPrompt, expectJSON, promptName }) => {
  if (expectJSON && promptName === 'extraction') {
    // Return custom mock structure based on prompt content
    if (prompt.includes('Alpha') || prompt.includes('alpha')) {
      return {
        title: 'Project Alpha Blueprint',
        category: 'Development',
        priority: 'high',
        importantDates: [{ label: 'RFP Deadline', date: '2026-08-10T00:00:00.000Z' }],
        deadline: '2026-08-10T00:00:00.000Z',
        requiredDocuments: ['Blueprint doc'],
        actionItems: ['Read blueprint'],
        suggestedAssignee: 'Developer A'
      };
    } else if (prompt.includes('Beta') || prompt.includes('beta')) {
      return {
        title: 'Project Beta Contract',
        category: 'Legal',
        priority: 'medium',
        importantDates: [{ label: 'Sign Deadline', date: '2026-09-01T00:00:00.000Z' }],
        deadline: '2026-09-01T00:00:00.000Z',
        requiredDocuments: ['Contract doc'],
        actionItems: ['Sign contract'],
        suggestedAssignee: 'Lawyer B'
      };
    } else {
      return {
        title: 'Project Gamma Notes',
        category: 'Planning',
        priority: 'low',
        importantDates: [{ label: 'Kickoff', date: '2026-10-01T00:00:00.000Z' }],
        deadline: '2026-10-01T00:00:00.000Z',
        requiredDocuments: ['Kickoff checklist'],
        actionItems: ['Schedule meeting'],
        suggestedAssignee: 'PM C'
      };
    }
  }
  return '';
};

async function run() {
  console.log('=== Starting E2E Batch Upload & Duplicate Integration Verification ===');

  // Initialize Mongo Memory Server
  console.log('Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`Memory MongoDB started at: ${mongoUri}`);

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const server = app.listen(PORT, () => {
    console.log(`Test Express server listening on ${API_URL}`);
  });

  // Verify ChromaDB client is reachable
  const chromaClient = new ChromaClient({ path: process.env.VECTOR_DB_URL || 'http://localhost:8000' });
  try {
    const version = await chromaClient.version();
    console.log(`Connected to ChromaDB successfully. Version: ${version}`);
  } catch (err) {
    console.error('ChromaDB is not reachable. Make sure Chroma is running.');
    process.exit(1);
  }

  try {
    // Clean collections before test
    await chromaClient.deleteCollection({ name: 'tickit_ai_document_chunks' }).catch(() => {});
    await chromaClient.getOrCreateCollection({ name: 'tickit_ai_document_chunks' });

    // Step 1: Register user
    console.log('\n--- Step 1: Register User ---');
    const userPayload = {
      email: 'batch-tester@example.com',
      password: 'testPassword123',
      name: 'Batch Tester'
    };

    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    
    const regData = await regRes.json();
    console.log(`Status: ${regRes.status}`);
    const token = regData.token;

    // Step 2: Upload a single plain text document to serve as the duplicate base
    console.log('\n--- Step 2: Ingest Base Document (Alpha) ---');
    const baseText = 'Project Alpha requirements text. This is confidential Alpha project details. Must read blueprint.';
    const formDataBase = new FormData();
    formDataBase.append('text', baseText);
    formDataBase.append('title', 'Project Alpha');

    const baseRes = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formDataBase
    });

    const baseData = await baseRes.json();
    console.log(`Upload status: ${baseRes.status}`);
    console.log(`Extracted opportunity ID: ${baseData.opportunity._id}`);

    // Step 3: Perform Batch upload
    // Batch contains:
    // 1. File A: Same content as baseText (should be detected as duplicate)
    // 2. File B: Fresh content (Beta) (should be processed as success)
    // 3. File C: Fresh content (Gamma) (should be processed as success)
    console.log('\n--- Step 3: Run Batch Upload ---');

    const fileABlob = new Blob([baseText], { type: 'text/plain' });
    const fileBBlob = new Blob(['Project Beta Contract details. Deadline to sign is September 1, 2026.'], { type: 'text/plain' });
    const fileCBlob = new Blob(['Project Gamma kickoff notes. Schedule meeting on October 1, 2026.'], { type: 'text/plain' });

    const batchFormData = new FormData();
    batchFormData.append('files', fileABlob, 'Project_Alpha.txt');
    batchFormData.append('files', fileBBlob, 'Project_Beta.txt');
    batchFormData.append('files', fileCBlob, 'Project_Gamma.txt');

    const batchRes = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: batchFormData
    });

    const batchData = await batchRes.json();
    console.log(`Batch upload response status: ${batchRes.status}`);
    console.log(JSON.stringify(batchData, null, 2));

    // Assert results structure
    if (!batchData.results || batchData.results.length !== 3) {
      throw new Error(`Expected results array of length 3, got: ${JSON.stringify(batchData)}`);
    }

    const [resA, resB, resC] = batchData.results;

    if (resA.status !== 'duplicate') {
      throw new Error(`Expected File A to be a duplicate, got: ${resA.status}`);
    }
    if (resB.status !== 'success' || !resB.opportunityId) {
      throw new Error(`Expected File B to be success, got: ${resB.status}`);
    }
    if (resC.status !== 'success' || !resC.opportunityId) {
      throw new Error(`Expected File C to be success, got: ${resC.status}`);
    }

    console.log('\n======================================================');
    console.log('SUCCESS: Batch upload E2E verification passed successfully!');
    console.log('======================================================');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    console.log('Cleaning up server and database connections...');
    server.close();
    await mongoose.connection.close();
    await mongoServer.stop();
    console.log('Done.');
  }
}

run();
