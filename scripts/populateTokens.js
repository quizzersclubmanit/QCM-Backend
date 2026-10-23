import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import QbitRegistration from '../models/QbitRegistration.js';
import { generatePassToken } from '../lib/passSecurity.js';

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB.');

  const teams = await QbitRegistration.find({});
  console.log(`📊 Found ${teams.length} total teams in MongoDB.`);

  let updatedCount = 0;
  for (const team of teams) {
    const token = team.passToken || generatePassToken(team.registrationCode);
    await QbitRegistration.updateOne({ _id: team._id }, { $set: { passToken: token } });
    updatedCount++;
  }

  console.log(`🎉 Successfully populated passToken for ${updatedCount} teams in MongoDB!`);

  // Verify sample
  const sample = await QbitRegistration.find({})
    .select('registrationCode teamName email passToken')
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  console.log('\n🔍 Sample verified records in MongoDB:');
  console.log(JSON.stringify(sample, null, 2));

  process.exit(0);
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
