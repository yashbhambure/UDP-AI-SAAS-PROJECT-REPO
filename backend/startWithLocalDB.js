require('dotenv').config();
const { MongoMemoryServer } = require('mongodb-memory-server');

async function main() {
  console.log('[Runner] Starting local MongoMemoryServer...');
  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  console.log(`[Runner] Local MongoDB started at: ${uri}`);
  process.env.MONGO_URI = uri;
  // Now require server.js to start the server
  require('./src/server.js');
}

main().catch(err => {
  console.error('[Runner] Failed to start with memory server:', err);
  process.exit(1);
});
