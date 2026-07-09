require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Cab = require('./server/models/Cab');
const TripBundle = require('./server/models/TripBundle');

async function seedMissing() {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    // 1. Cab Seeding
    const cabsCount = await Cab.countDocuments();
    console.log(`Current Cabs in DB: ${cabsCount}`);
    if (cabsCount === 0) {
      console.log('Reading local cabs.json fallback data...');
      const localCabs = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'cabs.json'), 'utf8'));
      // Remove or keep _id depending on preference. Let's keep it to keep IDs identical.
      await Cab.insertMany(localCabs);
      console.log(`✅ Seeded ${localCabs.length} cabs from data/cabs.json to MongoDB Atlas.`);
    } else {
      console.log('Cabs already seeded in DB.');
    }

    // 2. TripBundle Seeding
    const bundlesCount = await TripBundle.countDocuments();
    console.log(`Current Trip Bundles in DB: ${bundlesCount}`);
    if (bundlesCount === 0) {
      console.log('Reading local tripbundles.json fallback data...');
      const localBundles = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'tripbundles.json'), 'utf8'));
      await TripBundle.insertMany(localBundles);
      console.log(`✅ Seeded ${localBundles.length} trip bundles from data/tripbundles.json to MongoDB Atlas.`);
    } else {
      console.log('Trip bundles already seeded in DB.');
    }

    console.log('Seeding check complete.');
  } catch (err) {
    console.error('❌ Error seeding missing data:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedMissing();
