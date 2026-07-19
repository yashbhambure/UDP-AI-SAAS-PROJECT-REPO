require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ChromaClient } = require('chromadb');

// 1. Mock the LLM and Embedding services to run without calling external API
const llmService = require('./src/services/llmService');

llmService.getEmbedding = async (text) => {
  // Return a dummy 384-dimension vector
  const embedding = new Array(384).fill(0);
  // Add some deterministic pattern based on text so it is not pure zeros
  for (let i = 0; i < 384; i++) {
    embedding[i] = Math.sin(i + text.length) * 0.1;
  }
  return embedding;
};

llmService.callLLM = async ({ prompt, systemPrompt, expectJSON, promptName }) => {
  console.log(`[MOCK LLM] callLLM called for "${promptName}"`);
  
  if (expectJSON) {
    // Determine which document is being uploaded from the prompt content
    if (prompt.includes('Apollo') || prompt.includes('Acme')) {
      return {
        title: 'Acme Project Apollo RFP',
        summary: 'Acme Corporation Request for Proposal for Project Apollo.',
        importantDates: [
          { label: 'Milestone Webinar', date: '2026-07-20T00:00:00.000Z' }
        ],
        deadline: '2026-08-01T00:00:00.000Z',
        requiredDocuments: ['Initial Pitch Deck', 'Detailed Budget Spreadsheet', 'Security Compliance Report'],
        actionItems: ['Schedule introductory meeting with Acme team.', 'Prepare and draft initial Apollo pitch deck.'],
        priority: 'high',
        category: 'RFP',
        suggestedAssignee: 'A A'
      };
    } else if (prompt.includes('Orion') || prompt.includes('Beta')) {
      return {
        title: 'Beta Corp Orion Bid',
        summary: 'Orion Bid Details for Beta Corp.',
        importantDates: [],
        deadline: '2026-07-18T00:00:00.000Z',
        requiredDocuments: [],
        actionItems: ['Submit security questionnaire.', 'Finalize Orion pricing matrix.'],
        priority: 'medium',
        category: 'Bid',
        suggestedAssignee: 'B B'
      };
    } else if (prompt.includes('Banana') || prompt.includes('User B')) {
      return {
        title: 'Banana Corp Secret Recipe',
        summary: 'Top secret banana bread recipe document.',
        importantDates: [],
        deadline: '2026-12-25T00:00:00.000Z',
        requiredDocuments: [],
        actionItems: ['Buy organic bananas.', 'Bake bread.'],
        priority: 'low',
        category: 'Recipe',
        suggestedAssignee: 'User B'
      };
    } else {
      return {
        title: 'Generic Extracted Doc',
        summary: 'Generic document.',
        importantDates: [],
        deadline: null,
        requiredDocuments: [],
        actionItems: [],
        priority: 'low',
        category: 'General',
        suggestedAssignee: 'Assignee'
      };
    }
  } else {
    // Search query responses
    if (prompt.includes('Banana')) {
      return 'Grounded Answer: User B has a Banana Corp Secret Recipe.';
    }
    return 'Grounded Answer: This is a search response answering User A\'s query based on User A\'s documents.';
  }
};

// Now import the app (which will use the mocked services)
const app = require('./src/app');

const PORT = 5002;
const API_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('=== Starting Data Isolation & Multi-User Verification ===');
  
  // 2. Initialize Mongo Memory Server
  console.log('Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  console.log(`Memory MongoDB started at: ${mongoUri}`);
  
  // Connect mongoose
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  // 3. Start Express app server in-process on port 5002
  const server = app.listen(PORT, () => {
    console.log(`Test Express server listening on ${API_URL}`);
  });

  // Verify ChromaDB client is reachable
  const chromaClient = new ChromaClient({ path: process.env.VECTOR_DB_URL || 'http://localhost:8000' });
  try {
    const version = await chromaClient.version();
    console.log(`Connected to ChromaDB successfully. Version: ${version}`);
  } catch (err) {
    console.error('ChromaDB connectivity check failed. Make sure Chroma is running.');
    throw err;
  }

  try {
    // Clear ChromaDB collection before test to ensure clean state
    console.log('Cleaning ChromaDB collections...');
    try {
      await chromaClient.deleteCollection({ name: 'tickit_ai_document_chunks' });
      console.log('Deleted existing tickit_ai_document_chunks collection.');
    } catch (e) {
      console.log('Collection did not exist or could not be deleted.');
    }

    // 4. Register User A
    const userAPayload = {
      email: 'user-a@example.com',
      password: 'usera1234',
      name: 'User A'
    };

    console.log('\n--- Step 1: Register User A ---');
    const regResA = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userAPayload)
    });
    
    const regDataA = await regResA.json();
    console.log(`User A Register Status: ${regResA.status}`);
    const tokenA = regDataA.token;
    const userIdA = regDataA.user.id;
    console.log(`User A ID: ${userIdA}`);

    // 5. Register User B
    const userBPayload = {
      email: 'user-b@example.com',
      password: 'userb1234',
      name: 'User B'
    };

    console.log('\n--- Step 2: Register User B ---');
    const regResB = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userBPayload)
    });
    
    const regDataB = await regResB.json();
    console.log(`User B Register Status: ${regResB.status}`);
    const tokenB = regDataB.token;
    const userIdB = regDataB.user.id;
    console.log(`User B ID: ${userIdB}`);

    // 6. User A uploads Document A (Acme Project Apollo RFP)
    console.log('\n--- Step 3: User A Uploads Document A (Acme Project Apollo RFP) ---');
    const docAPayload = {
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

    const docARes = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify(docAPayload)
    });

    const docAData = await docARes.json();
    console.log(`Upload Document A Status: ${docARes.status}`);
    console.log('Extracted Title:', docAData.opportunity?.title);

    // 7. User B uploads Document B (Banana Corp Secret Recipe)
    console.log('\n--- Step 4: User B Uploads Document B (Banana Corp Secret Recipe) ---');
    const docBPayload = {
      title: 'Banana Corp Secret Recipe',
      text: `BANANA CORP CONFIDENTIAL RECIPE
Subject: Secret Banana Bread Recipe
Deadline to Bake: December 25, 2026.
Instructions:
- Buy organic bananas.
- Bake bread.`
    };

    const docBRes = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify(docBPayload)
    });

    const docBData = await docBRes.json();
    console.log(`Upload Document B Status: ${docBRes.status}`);
    console.log('Extracted Title:', docBData.opportunity?.title);

    // Let ChromaDB sync
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 8. Confirm Chunks indexed in ChromaDB
    const collection = await chromaClient.getOrCreateCollection({ name: 'tickit_ai_document_chunks' });
    const count = await collection.count();
    console.log(`\nChromaDB collection count: ${count} total chunks`);

    // Let's retrieve all documents in ChromaDB directly to verify they are tagged with proper userIds
    const allChromaData = await collection.get();
    console.log('--- Raw ChromaDB Contents ---');
    for (let i = 0; i < allChromaData.ids.length; i++) {
      console.log(`Chunk ${allChromaData.ids[i]}: metadata.userId = "${allChromaData.metadatas[i].userId}", metadata.title = "${allChromaData.metadatas[i].title}"`);
    }

    // 9. Run Search Query as User A
    console.log('\n--- Step 5: User A runs search query ---');
    const searchAPayload = { query: 'What documents does Acme Apollo require?' };
    const searchARes = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify(searchAPayload)
    });

    const searchAData = await searchARes.json();
    console.log(`User A Search Status: ${searchARes.status}`);
    console.log('User A Source Chunks Returned:');
    console.log(JSON.stringify(searchAData.sourceChunks, null, 2));

    // Assert that User A's results only include Acme/Apollo, never Banana Corp
    const hasUserBChunkInA = searchAData.sourceChunks.some(chunk => chunk.title.includes('Banana'));
    if (hasUserBChunkInA) {
      throw new Error('SECURITY VIOLATION: User A\'s search results returned User B\'s document chunks!');
    } else {
      console.log('SUCCESS: User A\'s search results did NOT leak User B\'s chunks.');
    }

    // Assert that User A's opportunities returned only include User A's opportunities
    console.log('User A Source Opportunities Returned (MongoDB):');
    console.log(JSON.stringify(searchAData.sourceOpportunities, null, 2));
    const hasUserBOppInA = searchAData.sourceOpportunities.some(opp => opp.title.includes('Banana'));
    if (hasUserBOppInA) {
      throw new Error('SECURITY VIOLATION: User A\'s search results returned User B\'s opportunities!');
    } else {
      console.log('SUCCESS: User A\'s search results did NOT leak User B\'s opportunities.');
    }

    // 10. Run Search Query as User B
    console.log('\n--- Step 6: User B runs search query ---');
    const searchBPayload = { query: 'Banana secret recipe' };
    const searchBRes = await fetch(`${API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify(searchBPayload)
    });

    const searchBData = await searchBRes.json();
    console.log(`User B Search Status: ${searchBRes.status}`);
    console.log('User B Source Chunks Returned:');
    console.log(JSON.stringify(searchBData.sourceChunks, null, 2));

    // Assert that User B's results only include Banana Corp, never Acme/Apollo
    const hasUserAChunkInB = searchBData.sourceChunks.some(chunk => chunk.title.includes('Apollo') || chunk.title.includes('Acme'));
    if (hasUserAChunkInB) {
      throw new Error('SECURITY VIOLATION: User B\'s search results returned User A\'s document chunks!');
    } else {
      console.log('SUCCESS: User B\'s search results did NOT leak User A\'s chunks.');
    }

    console.log('User B Source Opportunities Returned (MongoDB):');
    console.log(JSON.stringify(searchBData.sourceOpportunities, null, 2));
    const hasUserAOppInB = searchBData.sourceOpportunities.some(opp => opp.title.includes('Apollo') || opp.title.includes('Acme'));
    if (hasUserAOppInB) {
      throw new Error('SECURITY VIOLATION: User B\'s search results returned User A\'s opportunities!');
    } else {
      console.log('SUCCESS: User B\'s search results did NOT leak User A\'s opportunities.');
    }

    console.log('\n======================================================');
    console.log('VERIFICATION COMPLETE: Data Isolation is 100% verified.');
    console.log('======================================================');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    console.log('\nCleaning up server and database connections...');
    server.close();
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('Done.');
    process.exit(0);
  }
}

run();
