const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('MONGO_URI is not set in environment.');
  process.exit(1);
}

const Document = require('../src/models/Document');
const Opportunity = require('../src/models/Opportunity');
const Task = require('../src/models/Task');
const ChecklistItem = require('../src/models/ChecklistItem');
const Reminder = require('../src/models/Reminder');

async function clean() {
  console.log(`Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);
  console.log('Connected.');

  // Find documents named "Prompt Engineering.pdf" or incomplete/failed
  const filename = 'Prompt Engineering.pdf';
  const staleDocs = await Document.find({
    $or: [
      { originalFilename: filename },
      { status: { $ne: 'processed' } },
      { title: { $in: ['', null] } }
    ]
  });

  console.log(`Found ${staleDocs.length} candidate stale/incomplete Document records:`);

  for (const doc of staleDocs) {
    console.log(`- Document ID: ${doc._id}, Title: "${doc.title}", Status: "${doc.status}", File: "${doc.originalFilename}"`);
    
    // Find associated opportunities
    const opps = await Opportunity.find({ documentId: doc._id });
    for (const opp of opps) {
      console.log(`  -> Deleting Opportunity ID: ${opp._id}, Title: "${opp.title}"`);
      await Task.deleteMany({ opportunityId: opp._id });
      await ChecklistItem.deleteMany({ opportunityId: opp._id });
      await Reminder.deleteMany({ opportunityId: opp._id });
      await Opportunity.deleteOne({ _id: opp._id });
    }
    
    console.log(`  -> Deleting Document ID: ${doc._id}`);
    await Document.deleteOne({ _id: doc._id });
  }

  console.log('Clean up completed.');
  await mongoose.connection.close();
}

clean().catch(err => {
  console.error('Cleanup failed:', err);
  mongoose.connection.close();
});
