const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Native fetch is available in Node 18+
const API_URL = 'http://localhost:5000';

async function findMongoUri() {
  const tasksDir = 'C:\\Users\\DELL\\.gemini\\antigravity-ide\\brain\\a0e17c50-0e9d-4be7-b968-32148ed347ed\\.system_generated\\tasks';
  if (!fs.existsSync(tasksDir)) {
    throw new Error(`Tasks directory not found at: ${tasksDir}`);
  }

  const files = fs.readdirSync(tasksDir);
  for (const file of files) {
    if (file.endsWith('.log')) {
      const content = fs.readFileSync(path.join(tasksDir, file), 'utf8');
      const match = content.match(/Local MongoDB started at: (mongodb:\/\/127\.0\.1:\d+\/|mongodb:\/\/127\.0\.0\.1:\d+\/)/);
      if (match) {
        return match[1];
      }
    }
  }
  throw new Error('Could not find Local MongoDB URI in task logs');
}

async function run() {
  console.log('=== Starting E2E Reminder Check Test ===');

  // Step 0: Find and connect to MongoDB
  const mongoUri = await findMongoUri();
  console.log(`Connecting to Mongo Memory Server at: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  const Reminder = require('./src/models/Reminder');
  const Notification = require('./src/models/Notification');
  const Task = require('./src/models/Task');

  // Step 1: Register/Login Test User
  const credentials = {
    email: `reminder-test-${Date.now()}@test.com`, // Unique email to ensure clean run
    password: 'test1234',
    name: 'E2E Reminder Tester'
  };

  console.log('\n--- Step 1: Register User ---');
  console.log(`Request: POST ${API_URL}/api/auth/register`);
  console.log(JSON.stringify(credentials, null, 2));

  const registerRes = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });

  const registerData = await registerRes.json();
  console.log(`Response Status: ${registerRes.status}`);
  console.log(JSON.stringify(registerData, null, 2));

  if (!registerRes.ok) {
    throw new Error(`Registration failed: ${JSON.stringify(registerData)}`);
  }

  const token = registerData.token;
  const userId = registerData.user.id;

  // Step 2: Upload Document
  console.log('\n--- Step 2: Upload Document ---');
  // Create a document text specifying deadline as tomorrow (July 13, 2026)
  const docPayload = {
    title: 'Urgent Project Proposal',
    text: `PROPOSAL FOR NEXT GENERATION INFRASTRUCTURE
    
Deadline for complete draft submission: July 13, 2026.
Immediate Action Item: Pay renewal fee.
Immediate Action Item: Send draft proposal to coordinator.`
  };

  console.log(`Request: POST ${API_URL}/api/documents/upload`);
  console.log(`Headers: Authorization: Bearer <TOKEN>`);
  console.log(JSON.stringify(docPayload, null, 2));

  const uploadRes = await fetch(`${API_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(docPayload)
  });

  const uploadData = await uploadRes.json();
  console.log(`Response Status: ${uploadRes.status}`);
  console.log(JSON.stringify(uploadData, null, 2));

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${JSON.stringify(uploadData)}`);
  }

  // Let's verify that a Reminder was created in MongoDB
  const reminders = await Reminder.find({ userId });
  console.log(`\nCreated Reminders in MongoDB count: ${reminders.length}`);
  reminders.forEach((r, idx) => {
    console.log(`[Reminder ${idx}] ID: ${r._id}, Label: "${r.label}", remindAt: ${r.remindAt.toISOString()}, sent: ${r.sent}`);
  });

  if (reminders.length === 0) {
    throw new Error('No reminders were created.');
  }

  // Set the remindAt field of the reminders to the past to make them due
  console.log('\nUpdating reminders to the past to make them due...');
  const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
  await Reminder.updateMany({ userId }, { remindAt: pastDate });
  console.log('Reminders updated successfully.');

  const updatedReminders = await Reminder.find({ userId });
  updatedReminders.forEach((r, idx) => {
    console.log(`[Updated Reminder ${idx}] ID: ${r._id}, Label: "${r.label}", remindAt: ${r.remindAt.toISOString()}, sent: ${r.sent}`);
  });

  // Step 3: Call run-now endpoint
  console.log('\n--- Step 3: Run Now ---');
  console.log(`Request: POST ${API_URL}/api/reminders/run-now`);
  console.log(`Headers: Authorization: Bearer <TOKEN>`);

  const runNowRes = await fetch(`${API_URL}/api/reminders/run-now`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const runNowData = await runNowRes.json();
  console.log(`Response Status: ${runNowRes.status}`);
  console.log(JSON.stringify(runNowData, null, 2));

  if (!runNowRes.ok) {
    throw new Error(`Run-now failed: ${JSON.stringify(runNowData)}`);
  }

  // Step 4: Verify MongoDB and Logs
  console.log('\n--- Step 4: Verification ---');
  const finalReminders = await Reminder.find({ userId });
  console.log('Final Reminders state:');
  finalReminders.forEach((r, idx) => {
    console.log(`[Reminder ${idx}] ID: ${r._id}, Label: "${r.label}", sent: ${r.sent} (expected: true)`);
  });

  const notifications = await Notification.find({ userId });
  console.log(`\nCreated Notifications count: ${notifications.length} (expected: > 0)`);
  notifications.forEach((n, idx) => {
    console.log(`[Notification ${idx}] ID: ${n._id}, Message: "${n.message}", type: "${n.type}"`);
  });

  await mongoose.disconnect();
  console.log('\n=== E2E Test Completed Successfully ===');
}

run().catch(err => {
  console.error('Test run failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
