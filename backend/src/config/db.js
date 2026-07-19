const mongoose = require('mongoose');
const logger = require('../utils/logger');

let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI environment variable is not set');
  }

  const options = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
  };

  let retries = 5;
  while (retries > 0) {
    try {
      const conn = await mongoose.connect(mongoUri, options);
      isConnected = true;
      logger.info(`MongoDB connected: ${conn.connection.host}`);
      return;
    } catch (err) {
      retries -= 1;
      logger.error(`MongoDB connection failed (${retries} retries left): ${err.message}`);
      if (retries === 0) throw err;
      // Wait 3 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
};

// Graceful disconnect on app shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed on app termination');
  process.exit(0);
});

module.exports = connectDB;
