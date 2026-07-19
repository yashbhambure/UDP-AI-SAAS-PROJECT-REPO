require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('./src/app');
const { ChromaClient } = require('chromadb');

const PORT = 5001;
const API_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('=== Starting Week 2 E2E Search/RAG Verification ===');
  
  // 1. Initialize Mongo Memory Server
  console.log('Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`Memory MongoDB started at: ${mongoUri}`);
  
  // Connect mongoose
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // 2. Start Express app server in-process on port 5001
  const server = app.listen(PORT, () => {
    console.log(`Test Express server listening on ${API_URL}`);
  });

  // Verify ChromaDB client is reachable
  const chromaClient = new ChromaClient({ path: process.env.VECTOR_DB_URL || 'http://localhost:8000' });
  try {
    const version = await chromaClient.version();
    console.log(`Connected to ChromaDB successfully. Version: ${version}`);
  } catch (err) {
    console.error('ChromaDB connectivity check failed. Make sure Chroma is running on port 8000.');
    throw err;
  }

  try {
    // 3. Register User
    const userPayload = {
      email: 'search-tester@example.com',
      password: 'search1234',
      name: 'Search Tester'
    };

    console.log('\n--- Step 1: Register User ---');
    console.log(`POST ${API_URL}/api/auth/register`);
    
    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    
    const regData = await regRes.json();
    console.log(`Status: ${regRes.status}`);
    console.log(JSON.stringify(regData, null, 2));

    const token = regData.token;

    // 4. Upload Document 1 (Acme Apollo RFP - Deadline Aug 1, 2026)
    console.log('\n--- Step 2a: Upload Document 1 (Acme Project Apollo RFP) ---');
    const doc1Payload = {
      title: 'Acme Project Apollo RFP',
      text: `PROJECT APOLLO - REQUEST FOR PROPOSAL
Client: Acme Corporation
RFP Publish Date: July 12, 2026
Deadline for Pitch Deck: August 1, 2026.
Milestone Webinar: July 20, 2026.
Required Items:
1. Initial Pitch Deck (PDF)
2. Detailed Budget Spreadsheet (XLSX)
3. Security Compliance Report

Immediate Action Items:
- Schedule introductory meeting with Acme team.
- Prepare and draft initial Apollo pitch deck.`
    };

    const doc1Res = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(doc1Payload)
    });

    const doc1Data = await doc1Res.json();
    console.log(`Status: ${doc1Res.status}`);
    console.log('Extracted Title:', doc1Data.opportunity?.title);
    console.log('Deadline:', doc1Data.opportunity?.deadline);

    // 5. Upload Document 2 (Beta Corp Orion Bid - Deadline July 18, 2026)
    console.log('\n--- Step 2b: Upload Document 2 (Beta Corp Orion Bid) ---');
    const doc2Payload = {
      title: 'Beta Corp Orion Bid',
      text: `ORION BID DETAILS - BETA CORP
Bid Deadline: July 18, 2026.
Action Items:
- Submit security questionnaire.
- Finalize Orion pricing matrix.`
    };

    const doc2Res = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(doc2Payload)
    });

    const doc2Data = await doc2Res.json();
    console.log(`Status: ${doc2Res.status}`);
    console.log('Extracted Title:', doc2Data.opportunity?.title);
    console.log('Deadline:', doc2Data.opportunity?.deadline);

    // Give ChromaDB a second to sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Verify ChromaDB collections and chunks
    console.log('\n--- Verification: Querying ChromaDB ---');
    const collection = await chromaClient.getOrCreateCollection({ name: 'tickit_ai_document_chunks' });
    const count = await collection.count();
    console.log(`ChromaDB collection 'tickit_ai_document_chunks' count: ${count} total chunks`);

    // 7. Perform Semantic Search Query
    console.log('\n--- Step 3: Semantic Search Query (RAG Citing Titles) ---');
    const query1 = { query: 'What documents does Acme Apollo require?' };
    console.log(`POST ${API_URL}/api/search`);
    console.log(JSON.stringify(query1, null, 2));

    const search1Res = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(query1)
    });

    const search1Data = await search1Res.json();
    console.log(`Status: ${search1Res.status}`);
    console.log('\nResponse Answer:');
    console.log(search1Data.answer);
    console.log('\nResponse Chunks Returned:');
    console.log(JSON.stringify(search1Data.sourceChunks, null, 2));

    // 8. Perform Date-Sortable Query
    console.log('\n--- Step 4: Date-Sortable Query (Nearest Deadline) ---');
    const query2 = { query: 'Which opportunity has the nearest deadline?' };
    console.log(`POST ${API_URL}/api/search`);
    console.log(JSON.stringify(query2, null, 2));

    const search2Res = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(query2)
    });

    const search2Data = await search2Res.json();
    console.log(`Status: ${search2Res.status}`);
    console.log('\nResponse Answer:');
    console.log(search2Data.answer);
    console.log('\nResponse Opportunities Checked (from MongoDB):');
    console.log(JSON.stringify(search2Data.sourceOpportunities, null, 2));

  } catch (err) {
    console.error('Test execution failed:', err);
  } finally {
    // Shutdown
    console.log('\nCleaning up server and database connections...');
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Done.');
    process.exit(0);
  }
}

run();
