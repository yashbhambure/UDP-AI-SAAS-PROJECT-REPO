require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const validateEnv = require('./config/env');
const logger = require('./utils/logger');

const startServer = async () => {
  try {
    // ── Step 1: Validate environment variables ───────────────────────────────
    validateEnv();
    logger.info('[Server] Environment variables validated.');

    // ── Step 2: Establish database connection ───────────────────────────────
    await connectDB();

    // ── Step 3: Seed mock users for SuggestedAssignee list ──────────────────
    const User = require('./models/User');
    const mockUsers = [
      { email: 'yash@tickit.ai', name: 'Yash', passwordHash: 'yash1234' },
      { email: 'alice@tickit.ai', name: 'Alice', passwordHash: 'alice1234' },
      { email: 'bob@tickit.ai', name: 'Bob', passwordHash: 'bob1234' },
    ];
    for (const mock of mockUsers) {
      const exists = await User.findOne({ email: mock.email });
      if (!exists) {
        // Will be automatically hashed in pre-save hook
        await User.create(mock);
        logger.info(`[Server] Seeded mock user: ${mock.name} (${mock.email})`);
      }
    }

    // ── Step 4: Start background reminder worker ────────────────────────────
    const { startReminderWorker } = require('./services/reminderWorker');
    startReminderWorker();

    // ── Step 5: Listen for incoming requests ─────────────────────────────────
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Tick-It AI API Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`[Server] Port ${PORT} is already in use — another server instance may still be running.`);
        logger.error(`[Server] Find the process holding port ${PORT}:`);
        logger.error(`  PowerShell: Get-NetTCPConnection -LocalPort ${PORT}`);
        logger.error(`  CMD: netstat -ano | findstr :${PORT}`);
        logger.error(`[Server] Kill it with:`);
        logger.error(`  PowerShell: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force`);
        logger.error(`  CMD: taskkill /PID <PID> /F`);
        process.exit(1);
      } else {
        throw err;
      }
    });
  } catch (err) {
    logger.error(`[Server] Initialization failed: ${err.message}`, err);
    process.exit(1);
  }
};

startServer();
