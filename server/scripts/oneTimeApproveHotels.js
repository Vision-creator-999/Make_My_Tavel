require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

if (!process.env.MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI is not defined in the environment variables.');
  process.exit(1);
}

console.log('⏳ Connecting to MongoDB Atlas...');
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas successfully.');
    try {
      // Require the Hotel schema definition
      require('../models/Hotel');
      const Hotel = mongoose.model('Hotel');

      console.log('⏳ Updating pending hotels to "Approved"...');
      const result = await Hotel.updateMany(
        { status: { $ne: 'Approved' } },
        { $set: { status: 'Approved' } }
      );

      console.log(`✅ Update completed successfully.`);
      console.log(`📊 Total matched hotels: ${result.matchedCount}`);
      console.log(`✏️ Total modified hotels: ${result.modifiedCount}`);

    } catch (err) {
      console.error('❌ Database migration query error:', err.message);
    } finally {
      console.log('⏳ Disconnecting from MongoDB...');
      await mongoose.disconnect();
      console.log('👋 Done.');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('❌ Connection error:', err.message);
    process.exit(1);
  });
