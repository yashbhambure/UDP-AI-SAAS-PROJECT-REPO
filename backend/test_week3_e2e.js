require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { ChromaClient } = require('chromadb');

// 1. Mock the LLM and Embedding services to run without calling external API
const llmService = require('./src/services/llmService');

llmService.getEmbedding = async (text) => {
  return new Array(384).fill(0).map((_, i) => Math.sin(i + text.length) * 0.1);
};

llmService.callLLM = async ({ prompt, systemPrompt, expectJSON, promptName }) => {
  if (expectJSON && promptName === 'extraction') {
    return {
      title: 'Acme Milestone Proposal',
      summary: 'A proposal detailing Acme milestone requirements.',
      importantDates: [
        { label: 'Milestone Review', date: '2026-07-20T00:00:00.000Z' }
      ],
      deadline: '2026-08-01T00:00:00.000Z',
      requiredDocuments: ['Draft PDF', 'Project Budget Spreadsheet'],
      actionItems: ['Prepare draft roadmap.', 'Submit compliance sheet.'],
      priority: 'high',
      category: 'RFP',
      suggestedAssignee: 'Alice Vance'
    };
  }
  return 'Grounded Answer';
};

const app = require('./src/app');
const Reminder = require('./src/models/Reminder');
const Task = require('./src/models/Task');
const Opportunity = require('./src/models/Opportunity');

const PORT = 5003;
const API_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('=== Starting Week 3 Task & Reminder Engine Verification ===');

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
      email: 'week3-tester@example.com',
      password: 'tester1234',
      name: 'Week 3 Tester'
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
      title: 'Acme Milestone Proposal',
      text: 'Acme Milestone Proposal. Deadline August 1, 2026. Action items: Prepare draft roadmap, Submit compliance sheet. Required: Draft PDF, Project Budget Spreadsheet.'
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
    console.log(`Document Ingested. Opportunity created: ID=${oppId}, status="${docData.opportunity.status}"`);

    // Let's verify details in DB
    const initialTasks = await Task.find({ opportunityId: oppId });
    console.log(`Auto-generated tasks count: ${initialTasks.length}`);
    initialTasks.forEach((t, i) => console.log(` - Task ${i+1}: "${t.title}" status="${t.status}"`));
    if (initialTasks.length !== 2) {
      throw new Error(`Expected 2 tasks, found ${initialTasks.length}`);
    }

    const initialReminders = await Reminder.find({ opportunityId: oppId });
    console.log(`Auto-scheduled reminders count: ${initialReminders.length}`);
    if (initialReminders.length === 0) {
      throw new Error('Expected reminders to be created.');
    }

    // 4. Test GET /api/opportunities
    console.log('\n--- Step 2: Test GET /api/opportunities ---');
    const oppsRes = await fetch(`${API_URL}/api/opportunities`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const oppsList = await oppsRes.json();
    console.log(`GET /api/opportunities status: ${oppsRes.status}, count: ${oppsList.length}`);
    if (oppsList.length !== 1 || oppsList[0]._id !== oppId) {
      throw new Error('Opportunities listing verification failed.');
    }

    // 5. Test GET /api/opportunities/:id
    console.log('\n--- Step 3: Test GET /api/opportunities/:id ---');
    const oppDetailRes = await fetch(`${API_URL}/api/opportunities/${oppId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const oppDetail = await oppDetailRes.json();
    console.log(`GET /api/opportunities/:id status: ${oppDetailRes.status}`);
    console.log(` - Checklist items count: ${oppDetail.checklistItems.length}`);
    console.log(` - Tasks count: ${oppDetail.tasks.length}`);
    if (oppDetail.tasks.length !== 2 || oppDetail.checklistItems.length !== 2) {
      throw new Error('Opportunity detail verification failed.');
    }

    // 5.5. Test PATCH /api/checklist-items/:id/status
    console.log('\n--- Step 3.5: Test PATCH /api/checklist-items/:id/status ---');
    const checklistItemId = oppDetail.checklistItems[0]._id;
    console.log(`Toggling checklist item ${checklistItemId} to checked=true`);
    const checklistPatchRes = await fetch(`${API_URL}/api/checklist-items/${checklistItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ checked: true })
    });
    const updatedChecklistItem = await checklistPatchRes.json();
    console.log(`PATCH /api/checklist-items/:id/status response status: ${checklistPatchRes.status}, checked=${updatedChecklistItem.checked}`);
    if (checklistPatchRes.status !== 200 || updatedChecklistItem.checked !== true) {
      throw new Error('Checklist item status update failed.');
    }

    // Verify User Isolation for Checklist item (try updating as a different user)
    console.log('Testing User Isolation for Checklist items (unauthorized user update)...');
    const userBPayloadForChecklist = {
      email: `isolation-tester-${Date.now()}@example.com`,
      password: 'tester1234',
      name: 'Isolation Tester'
    };
    const regResB = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userBPayloadForChecklist)
    });
    const regDataB = await regResB.json();
    const tokenB = regDataB.token;

    const unauthorizedRes = await fetch(`${API_URL}/api/checklist-items/${checklistItemId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`
      },
      body: JSON.stringify({ checked: false })
    });
    console.log(`Unauthorized PATCH status: ${unauthorizedRes.status} (expected: 404)`);
    if (unauthorizedRes.status !== 404) {
      throw new Error(`Expected 404 for unauthorized checklist status patch, found ${unauthorizedRes.status}`);
    }
    console.log('SUCCESS: User isolation verified for checklist items.');

    // 6. Test GET /api/tasks (filtering)
    console.log('\n--- Step 4: Test GET /api/tasks ---');
    const tasksRes = await fetch(`${API_URL}/api/tasks?status=todo`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tasksList = await tasksRes.json();
    console.log(`GET /api/tasks?status=todo status: ${tasksRes.status}, count: ${tasksList.length}`);
    if (tasksList.length !== 2) {
      throw new Error('Tasks listing / filter verification failed.');
    }

    // 7. Test GET /api/reminders
    console.log('\n--- Step 5: Test GET /api/reminders ---');
    const remindersRes = await fetch(`${API_URL}/api/reminders`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const remindersList = await remindersRes.json();
    console.log(`GET /api/reminders status: ${remindersRes.status}, count: ${remindersList.length}`);
    if (remindersList.length === 0) {
      throw new Error('Reminders listing verification failed.');
    }

    // 8. Test Task → Opportunity Cascade (Auto-complete)
    console.log('\n--- Step 6: Test Task → Opportunity Cascade (Auto-complete) ---');
    for (let i = 0; i < tasksList.length; i++) {
      const task = tasksList[i];
      console.log(`Completing task ${i+1}: "${task.title}"`);
      const updateRes = await fetch(`${API_URL}/api/tasks/${task._id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done' })
      });
      const updatedTask = await updateRes.json();
      console.log(`Updated status: "${updatedTask.status}"`);

      // Verify that this task's reminders are deactivated
      const activeReminders = await Reminder.find({ taskId: task._id, active: true });
      console.log(`Active reminders for task ${task._id}: ${activeReminders.length}`);
      if (activeReminders.length !== 0) {
        throw new Error('Task reminders were not deactivated when task was completed.');
      }
    }

    // Check parent opportunity status now
    const oppAfterCompletedRes = await fetch(`${API_URL}/api/opportunities/${oppId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const oppAfterCompleted = await oppAfterCompletedRes.json();
    console.log(`Opportunity status after completing all tasks: "${oppAfterCompleted.opportunity.status}" (expected: "completed")`);
    if (oppAfterCompleted.opportunity.status !== 'completed') {
      throw new Error('Opportunity did not auto-complete when all tasks were done.');
    }

    // 9. Test Task → Opportunity Cascade (Re-open)
    console.log('\n--- Step 7: Test Task → Opportunity Cascade (Re-open) ---');
    const taskToReopen = tasksList[0];
    console.log(`Re-opening task: "${taskToReopen.title}"`);
    const reopenRes = await fetch(`${API_URL}/api/tasks/${taskToReopen._id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'todo' })
    });
    const reopenedTask = await reopenRes.json();
    console.log(`Reopened task status: "${reopenedTask.status}"`);

    // Verify reminders are re-scheduled
    const rescheduledReminders = await Reminder.find({ taskId: taskToReopen._id, active: true });
    console.log(`Rescheduled active reminders count: ${rescheduledReminders.length}`);
    if (rescheduledReminders.length === 0) {
      throw new Error('Reminders were not rescheduled when task was reopened.');
    }

    // Verify parent opportunity status reverted to in_progress
    const oppAfterReopenRes = await fetch(`${API_URL}/api/opportunities/${oppId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const oppAfterReopen = await oppAfterReopenRes.json();
    console.log(`Opportunity status after re-opening task: "${oppAfterReopen.opportunity.status}" (expected: "in_progress")`);
    if (oppAfterReopen.opportunity.status !== 'in_progress') {
      throw new Error('Opportunity status did not revert to in_progress when task was reopened.');
    }

    // 10. Test Opportunity → Task Cascade (Manual Completion)
    console.log('\n--- Step 8: Test Opportunity → Task Cascade (Manual Completion) ---');
    console.log('Manually completing Opportunity...');
    const manualOppRes = await fetch(`${API_URL}/api/opportunities/${oppId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status: 'completed' })
    });
    const manualOpp = await manualOppRes.json();
    console.log(`Manually completed opportunity status: "${manualOpp.status}"`);

    // Verify all associated tasks are completed and reminders are deactivated
    const finalTasks = await Task.find({ opportunityId: oppId });
    const unfinishedTasks = finalTasks.filter(t => t.status !== 'done');
    console.log(`Unfinished tasks count: ${unfinishedTasks.length} (expected: 0)`);
    if (unfinishedTasks.length !== 0) {
      throw new Error('Tasks were not all completed on opportunity manual completion.');
    }

    const finalActiveReminders = await Reminder.find({ opportunityId: oppId, active: true });
    console.log(`Active reminders count: ${finalActiveReminders.length} (expected: 0)`);
    if (finalActiveReminders.length !== 0) {
      throw new Error('Reminders were not all deactivated on opportunity manual completion.');
    }

    console.log('\n=============================================================');
    console.log('WEEK 3 TASK & REMINDER ENGINE VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('=============================================================');

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
