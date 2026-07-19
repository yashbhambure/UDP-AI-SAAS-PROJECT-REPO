require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ChromaClient } = require('chromadb');

// 1. Mock the LLM and Embedding services to run without calling external API
const llmService = require('./src/services/llmService');

llmService.getEmbedding = async (text) => {
  return new Array(384).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
};

let shouldInsightsThrow = false;

llmService.callLLM = async ({ prompt, systemPrompt, expectJSON, promptName }) => {
  if (expectJSON && promptName === 'extraction') {
    return {
      title: 'Acme Future Deliverables',
      summary: 'A project list for future deliverables.',
      importantDates: [
        { label: 'Milestone Ingestion', date: '2026-07-20T00:00:00.000Z' }
      ],
      deadline: '2026-08-01T00:00:00.000Z',
      requiredDocuments: ['Required Document A'],
      actionItems: ['Task A', 'Task B'],
      priority: 'high',
      category: 'RFP',
      suggestedAssignee: 'Bob Bobson'
    };
  } else if (promptName === 'insights') {
    if (shouldInsightsThrow) {
      throw new Error('GoogleGenerativeAI Error: 429 Too Many Requests. Quota exceeded.');
    }
    return '1. You have one upcoming task due in 3 days.\n2. One opportunity is high priority.\n3. Make sure to complete Task A first.';
  }
  return 'Grounded Answer';
};

const app = require('./src/app');
const Reminder = require('./src/models/Reminder');
const Task = require('./src/models/Task');
const Opportunity = require('./src/models/Opportunity');

const PORT = 5004;
const API_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('=== Starting Week 4 Dashboard Summary & AI Insights Verification ===');

  console.log('Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const server = app.listen(PORT, () => {
    console.log(`Test Express server listening on ${API_URL}`);
  });

  const chromaClient = new ChromaClient({ path: process.env.VECTOR_DB_URL || 'http://localhost:8000' });
  try {
    await chromaClient.version();
  } catch (err) {
    console.error('ChromaDB connectivity check failed.');
    throw err;
  }

  try {
    // 2. Register Test User
    const userPayload = {
      email: 'week4-tester@example.com',
      password: 'tester1234',
      name: 'Week 4 Tester'
    };

    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    const regData = await regRes.json();
    const token = regData.token;
    const userId = regData.user.id;
    console.log(`Registered tester user: ID=${userId}`);

    // 3. Upload Document to seed Opportunity, Tasks, and Reminders
    console.log('\n--- Step 1: Ingest Document ---');
    const docPayload = {
      title: 'Acme Future Deliverables',
      text: 'Acme Future Deliverables. Deadline August 1, 2026. Action items: Task A, Task B. Required: Required Document A.'
    };

    const docRes = await fetch(`${API_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(docPayload)
    });
    const docData = await docRes.json();
    const oppId = docData.opportunity._id;
    console.log(`Document Ingested. Opportunity created: ID=${oppId}`);

    // 4. Update the generated Tasks to have specific deadlines & priority for summary logic
    const tasks = await Task.find({ opportunityId: oppId });
    console.log(`Modifying auto-generated tasks...`);

    // Task 0: Due in 3 days, priority high, status todo
    tasks[0].dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    tasks[0].priority = 'high';
    tasks[0].status = 'todo';
    await tasks[0].save();
    console.log(` - Updated Task 1: Title="${tasks[0].title}", Due=${tasks[0].dueDate.toISOString()}, Priority="${tasks[0].priority}", Status="${tasks[0].status}"`);

    // Task 1: Due in 10 days, priority medium, status todo
    tasks[1].dueDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    tasks[1].priority = 'medium';
    tasks[1].status = 'todo';
    await tasks[1].save();
    console.log(` - Updated Task 2: Title="${tasks[1].title}", Due=${tasks[1].dueDate.toISOString()}, Priority="${tasks[1].priority}", Status="${tasks[1].status}"`);

    // 5. Update Reminders to have specific dates
    console.log(`Modifying auto-generated reminders...`);
    const reminders = await Reminder.find({ opportunityId: oppId });
    
    // Set Reminder 0: due in 24 hours (upcoming next 48h)
    reminders[0].remindAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    reminders[0].active = true;
    reminders[0].sent = false;
    await reminders[0].save();
    console.log(` - Updated Reminder 1: remindAt=${reminders[0].remindAt.toISOString()}, active=${reminders[0].active}, sent=${reminders[0].sent}`);

    // Set Reminder 1: due in 72 hours (not in next 48h)
    reminders[1].remindAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    reminders[1].active = true;
    reminders[1].sent = false;
    await reminders[1].save();
    console.log(` - Updated Reminder 2: remindAt=${reminders[1].remindAt.toISOString()}, active=${reminders[1].active}, sent=${reminders[1].sent}`);

    // 6. Test GET /api/dashboard/summary
    console.log('\n--- Step 2: Fetch Dashboard Summary ---');
    const summaryRes = await fetch(`${API_URL}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const summaryData = await summaryRes.json();
    console.log(`GET /api/dashboard/summary status: ${summaryRes.status}`);
    console.log('Response JSON:');
    console.log(JSON.stringify(summaryData, null, 2));

    // Verify statistics are correct
    if (summaryData.opportunities.total !== 1) {
      throw new Error(`Expected 1 total opportunity, found ${summaryData.opportunities.total}`);
    }
    if (summaryData.opportunities.pending !== 1) {
      throw new Error(`Expected 1 pending opportunity, found ${summaryData.opportunities.pending}`);
    }
    if (summaryData.opportunities.completed !== 0) {
      throw new Error(`Expected 0 completed opportunities, found ${summaryData.opportunities.completed}`);
    }
    if (summaryData.tasksDueNext7Days !== 1) {
      throw new Error(`Expected 1 task due in next 7 days, found ${summaryData.tasksDueNext7Days}`);
    }
    if (summaryData.highPriorityTasks !== 1) {
      throw new Error(`Expected 1 high priority task, found ${summaryData.highPriorityTasks}`);
    }
    if (summaryData.upcomingReminders48h !== 1) {
      throw new Error(`Expected 1 upcoming reminder in next 48h, found ${summaryData.upcomingReminders48h}`);
    }
    if (!summaryData.insights.includes('upcoming task due in 3 days')) {
      throw new Error('Expected insights to contain text from the mock insights');
    }

    // 7. Test GET /api/dashboard/summary with Mocked Quota Exceeded (Rate-limit fallback)
    console.log('\n--- Step 3: Fetch Dashboard Summary with Mocked Rate Limit (Quota Exceeded) ---');
    shouldInsightsThrow = true;
    const fallbackRes = await fetch(`${API_URL}/api/dashboard/summary`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const fallbackData = await fallbackRes.json();
    console.log(`GET /api/dashboard/summary status: ${fallbackRes.status} (expected: 200)`);
    console.log('Fallback Insights Content:');
    console.log(fallbackData.insights);

    if (fallbackRes.status !== 200) {
      throw new Error(`Expected status 200, found ${fallbackRes.status}`);
    }

    const expectedFallback = 'AI insights are currently unavailable due to system limit constraints. Please review your active high-priority tasks and upcoming deadlines manually.';
    if (fallbackData.insights !== expectedFallback) {
      throw new Error(`Expected fallback insights, found: ${fallbackData.insights}`);
    }
    console.log('SUCCESS: Dashboard returned 200 with fallback message when LLM call failed.');

    console.log('\n========================================================================');
    console.log('WEEK 4 DASHBOARD SUMMARY & AI INSIGHTS VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('========================================================================');

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
