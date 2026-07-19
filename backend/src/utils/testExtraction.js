/**
 * testExtraction.js — Dev test utility to verify the Gemini LLM extraction pipeline.
 * Runs independently or as npm run test.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const validateEnv = require('../config/env');
const connectDB = require('../config/db');
const User = require('../models/User');
const Document = require('../models/Document');
const Opportunity = require('../models/Opportunity');
const { processDocument } = require('../services/extractionService');
const logger = require('./logger');

const SAMPLE_TEXT = `
TOP 10 SEED FUNDING PROGRAMS FOR AI STARTUPS IN 2026
--------------------------------------------------
Host: NextGen Tech Accelerator
Target Group: Early stage startups in Machine Learning, AI and robotics.
Deadline for applications: October 15, 2026.
Seed Funding Amount: Up to $250,000 in exchange for 6% equity.

Required documents:
1. Pitch deck (PDF)
2. Product demonstration video link
3. Incorporating certificate
4. Financial projections for next 2 years

Upcoming milestones and events:
- Informational webinar: August 20, 2026
- Early bird check-in: September 1, 2026
- Final Pitch Selection: November 1, 2026

Immediate actions:
- Complete the online application profile.
- Submit the draft deck for pre-review before September 15.
- Update your product demo video.

Suggested Lead: Yash (Program Director)
`;

const runTest = async () => {
  let mongoServer;
  try {
    validateEnv();

    const uri = process.env.MONGO_URI || '';
    if (uri.startsWith('mongodb+srv://') || process.env.USE_MEM_DB === 'true') {
      logger.info('[Test Runner] Detected Atlas/Remote MongoDB connection URI. Initializing MongoMemoryServer to bypass potential sandbox IP whitelisting constraints...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        mongoServer = await MongoMemoryServer.create();
        process.env.MONGO_URI = mongoServer.getUri();
        logger.info(`[Test Runner] Local MongoMemoryServer started at: ${process.env.MONGO_URI}`);
      } catch (memErr) {
        logger.warn(`[Test Runner] Failed to start MongoMemoryServer: ${memErr.message}. Falling back to default MONGO_URI.`);
      }
    }

    await connectDB();


    // 1. Create or get test user
    const email = 'test-runner@tickit.ai';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        passwordHash: 'testPassword123',
        name: 'Test Runner',
      });
      logger.info(`Created test user for runner: ${user._id}`);
    }

    // Clean up previous runs of this test document to allow re-runs
    const mockHash = require('./fileHash').hashContent(Buffer.from(SAMPLE_TEXT.trim(), 'utf-8'));
    const deletedDocs = await Document.deleteMany({ fileHash: mockHash, userId: user._id });
    if (deletedDocs.deletedCount > 0) {
      logger.info(`Cleaned up ${deletedDocs.deletedCount} old test document(s)`);
    }

    logger.info('Starting document extraction test...');
    const result = await processDocument({
      fileBuffer: Buffer.from(SAMPLE_TEXT.trim(), 'utf-8'),
      mimetype: 'text/plain',
      originalFilename: 'Seed_Funding_AI_2026.txt',
      userId: user._id,
    });

    console.log('\n=== TEST RESULTS ===');
    console.log('Document ID:', result.document._id);
    console.log('Document Title:', result.document.title);
    console.log('Document Summary:', result.document.summary);
    console.log('Document Status:', result.document.status);
    console.log('\nOpportunity extracted:');
    console.log(JSON.stringify(result.opportunity, null, 2));
    console.log('====================\n');

    logger.info('Test execution completed successfully.');
    if (mongoServer) {
      await mongoose.disconnect();
      await mongoServer.stop();
      logger.info('[Test Runner] Local MongoMemoryServer stopped.');
    }
    process.exit(0);
  } catch (err) {
    logger.error(`Test failed: ${err.message}`, err);
    if (mongoServer) {
      try {
        await mongoose.disconnect();
        await mongoServer.stop();
      } catch (cleanErr) {
        logger.error(`[Test Runner] Failed to clean up memory server: ${cleanErr.message}`);
      }
    }
    process.exit(1);
  }
};

runTest();
