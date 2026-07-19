require('dotenv').config();
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Define mock functions for tracking calls
const mockTwilioMessagesCreate = (...args) => {
  mockTwilioMessagesCreate.calls.push(args);
  return Promise.resolve({ sid: 'mock_twilio_sid_12345' });
};
mockTwilioMessagesCreate.calls = [];

const mockResendEmailsSend = (...args) => {
  mockResendEmailsSend.calls.push(args);
  return Promise.resolve({ id: 'mock_resend_email_67890' });
};
mockResendEmailsSend.calls = [];

// Intercept Node's require system to return mock SDKs for 'twilio' and 'resend'
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id) {
  if (id === 'twilio') {
    return (sid, token) => {
      return {
        messages: {
          create: mockTwilioMessagesCreate
        }
      };
    };
  }
  if (id === 'resend') {
    return {
      Resend: class MockResend {
        constructor(apiKey) {
          this.apiKey = apiKey;
        }
        get emails() {
          return {
            send: mockResendEmailsSend
          };
        }
      }
    };
  }
  return originalRequire.apply(this, arguments);
};

// Set environment variables for tests
process.env.RESEND_API_KEY = 're_test_key_12345';
process.env.TWILIO_ACCOUNT_SID = 'AC_test_sid_12345';
process.env.TWILIO_AUTH_TOKEN = 'token_test_12345';
process.env.TWILIO_PHONE_NUMBER = '+15551234567';
process.env.JWT_SECRET = 'test_jwt_secret_999';
process.env.NODE_ENV = 'development'; // allow run-now

const app = require('./src/app');
const User = require('./src/models/User');
const Document = require('./src/models/Document');
const Task = require('./src/models/Task');
const Opportunity = require('./src/models/Opportunity');
const Reminder = require('./src/models/Reminder');
const Notification = require('./src/models/Notification');

const PORT = 5009;
const API_URL = `http://localhost:${PORT}`;

async function run() {
  console.log('=== Starting E2E Notification Channels Verification ===');

  console.log('Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  console.log('Connected to Memory MongoDB.');

  const server = app.listen(PORT, () => {
    console.log(`Test Express server listening on ${API_URL}`);
  });

  try {
    // 1. Register User
    console.log('\n--- Step 1: Register Test User ---');
    const userPayload = {
      email: 'notif-tester@example.com',
      password: 'testPassword123',
      name: 'Notif Tester'
    };

    const regRes = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload)
    });
    
    if (!regRes.ok) {
      const errBody = await regRes.text();
      throw new Error(`Register failed: ${errBody}`);
    }

    const regData = await regRes.json();
    const token = regData.token;
    const userId = regData.user.id;
    console.log(`Registered user successfully. ID: ${userId}`);

    // 2. Call PATCH /api/users/me to update phone & configure preferences
    console.log('\n--- Step 2: Configure Notification Settings (E.164 Phone & Preferences) ---');
    
    // First, test validation error on invalid phone format
    const invalidPhonePayload = {
      phoneNumber: '15551234567', // Missing leading '+'
      notificationPreferences: { email: true, sms: true, inApp: true }
    };
    const invalidRes = await fetch(`${API_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(invalidPhonePayload)
    });
    console.log(`Invalid phone request status: ${invalidRes.status} (expected: 400)`);
    if (invalidRes.status !== 400) {
      throw new Error('Server allowed an invalid E.164 phone number format without throwing 400.');
    }
    const invalidData = await invalidRes.json();
    console.log(`Received expected format error: "${invalidData.error}"`);

    // Next, submit valid request
    const validPayload = {
      phoneNumber: '+15559876543', // Valid E.164
      notificationPreferences: { email: true, sms: true, inApp: true }
    };

    const updateRes = await fetch(`${API_URL}/api/users/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(validPayload)
    });

    if (!updateRes.ok) {
      const errBody = await updateRes.text();
      throw new Error(`Update profile failed: ${errBody}`);
    }

    const updateData = await updateRes.json();
    console.log('Profile updated successfully.');
    console.log(`Phone set: ${updateData.phoneNumber}`);
    console.log('Preferences set:', updateData.notificationPreferences);

    // Verify GET /api/users/me returns correct details
    const getRes = await fetch(`${API_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const getData = await getRes.json();
    if (getData.phoneNumber !== '+15559876543' || !getData.notificationPreferences.sms) {
      throw new Error('GET /api/users/me did not return the updated fields correctly.');
    }
    console.log('GET /api/users/me matches updated profile.');

    // 3. Seed active, past reminder directly in database
    console.log('\n--- Step 3: Seed Test Data (Opportunity, Task, Past Reminder) ---');
    const doc = await Document.create({
      userId: userId,
      originalFilename: 'test.pdf',
      fileType: 'pdf',
      title: 'Notif Test Doc',
      status: 'processed'
    });

    const opportunity = await Opportunity.create({
      documentId: doc._id,
      title: 'Notif Test Deal',
      clientName: 'Test Client Corp',
      userId: userId,
      value: 5000,
      status: 'pending'
    });

    const task = await Task.create({
      title: 'Review proposal slides',
      userId: userId,
      opportunityId: opportunity._id,
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
      status: 'todo'
    });

    const reminder = await Reminder.create({
      taskId: task._id,
      opportunityId: opportunity._id,
      userId: userId,
      remindAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes in the past
      channel: 'in-app',
      label: '7 days before deadline',
      active: true,
      sent: false
    });
    console.log(`Seeded Reminder ID: ${reminder._id}, scheduled for: ${reminder.remindAt.toISOString()}`);

    // 4. Trigger reminders run-now endpoint
    console.log('\n--- Step 4: Trigger Reminders Scan (POST /api/reminders/run-now) ---');
    const runRes = await fetch(`${API_URL}/api/reminders/run-now`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!runRes.ok) {
      const errBody = await runRes.text();
      throw new Error(`Run now reminders failed: ${errBody}`);
    }

    const runData = await runRes.json();
    console.log('Scan completed response:', runData);
    if (runData.dispatchedCount !== 1) {
      throw new Error(`Expected 1 dispatched reminder, but got: ${runData.dispatchedCount}`);
    }

    // 5. Assert notifications and mock calls
    console.log('\n--- Step 5: Verify Notification Routing and Mock Triggers ---');

    // A. Check in-app notification document
    const notifications = await Notification.find({ userId: userId });
    console.log(`Dispatched in-app notifications in DB: ${notifications.length}`);
    if (notifications.length !== 1) {
      throw new Error('In-app notification was not successfully created in database.');
    }
    const expectedMsg = 'Reminder: "Review proposal slides" is due. (7 days before deadline)';
    console.log(`In-app Notification message: "${notifications[0].message}"`);
    if (notifications[0].message !== expectedMsg) {
      throw new Error(`Notification message mismatch.\nExpected: "${expectedMsg}"\nGot: "${notifications[0].message}"`);
    }

    // B. Check Resend mock calls
    console.log(`Resend email mock calls count: ${mockResendEmailsSend.calls.length}`);
    if (mockResendEmailsSend.calls.length !== 1) {
      throw new Error(`Resend email send should have been called exactly once. Got: ${mockResendEmailsSend.calls.length}`);
    }
    const emailArg = mockResendEmailsSend.calls[0][0];
    console.log('Resend call args:', emailArg);
    if (emailArg.from !== 'onboarding@resend.dev') {
      throw new Error(`Resend from address must be onboarding@resend.dev. Got: "${emailArg.from}"`);
    }
    if (emailArg.to !== 'notif-tester@example.com') {
      throw new Error(`Resend to address must match user email. Got: "${emailArg.to}"`);
    }
    if (!emailArg.text.includes('Review proposal slides')) {
      throw new Error(`Email body does not contain task title.`);
    }

    // C. Check Twilio mock calls
    console.log(`Twilio SMS mock calls count: ${mockTwilioMessagesCreate.calls.length}`);
    if (mockTwilioMessagesCreate.calls.length !== 1) {
      throw new Error(`Twilio messages create should have been called exactly once. Got: ${mockTwilioMessagesCreate.calls.length}`);
    }
    const smsArg = mockTwilioMessagesCreate.calls[0][0];
    console.log('Twilio call args:', smsArg);
    if (smsArg.from !== '+15551234567') {
      throw new Error(`Twilio SMS from phone number must match env config. Got: "${smsArg.from}"`);
    }
    if (smsArg.to !== '+15559876543') {
      throw new Error(`Twilio SMS to phone number must match user phone. Got: "${smsArg.to}"`);
    }
    if (!smsArg.body.includes('Review proposal slides')) {
      throw new Error(`SMS body does not contain task title.`);
    }

    // D. Verify Reminder in DB is updated to sent: true
    const updatedReminder = await Reminder.findById(reminder._id);
    console.log(`Reminder sent status in DB: ${updatedReminder.sent} (expected: true)`);
    if (!updatedReminder.sent) {
      throw new Error('Reminder in database was not marked as sent.');
    }

    console.log('\n=============================================================');
    console.log('NOTIFICATION CHANNELS VERIFICATION COMPLETED SUCCESSFULLY!');
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
