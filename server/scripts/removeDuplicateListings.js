/**
 * removeDuplicateListings.js
 * 
 * Standalone script to clean up duplicate pending listings in the database.
 * Run manually via: node server/scripts/removeDuplicateListings.js
 */
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('⚠️ Could not configure DNS servers, using system defaults.');
}

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const mongoose = require('mongoose');

// Configure Node module search paths to resolve models and dependencies correctly
module.paths.push(path.join(__dirname, '../node_modules'));

const Cab = require('../models/Cab');
const Hotel = require('../models/Hotel');
const TripBundle = require('../models/TripBundle');

// Helper to safely extract creation time (either from createdAt or the MongoDB ObjectId)
function getCreationTime(doc) {
  if (doc.createdAt) {
    return new Date(doc.createdAt).getTime();
  }
  if (doc._id && typeof doc._id.getTimestamp === 'function') {
    return new Date(doc._id.getTimestamp()).getTime();
  }
  return 0;
}

async function run() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Cabs Deduplication (Match on plate + mobile)
    console.log('\n--- Deduplicating Cabs ---');
    const pendingCabs = await Cab.find({ status: 'Pending' });
    const cabGroups = {};
    
    pendingCabs.forEach(cab => {
      const plateNormalized = (cab.plate || '').trim().toLowerCase();
      const mobileNormalized = (cab.mobile || '').trim();
      const key = `${plateNormalized}|${mobileNormalized}`;
      if (!cabGroups[key]) cabGroups[key] = [];
      cabGroups[key].push(cab);
    });

    let cabsRemoved = 0;
    for (const key in cabGroups) {
      const list = cabGroups[key];
      if (list.length > 1) {
        // Sort ascending by creation time so oldest is first
        list.sort((a, b) => getCreationTime(a) - getCreationTime(b));
        // Keep the oldest (index 0) and delete the remaining duplicates
        const toDelete = list.slice(1);
        const idsToDelete = toDelete.map(item => item._id);
        
        await Cab.deleteMany({ _id: { $in: idsToDelete } });
        cabsRemoved += idsToDelete.length;
        console.log(`  Removed ${idsToDelete.length} duplicates for Cab key: "${key}" (Kept oldest ID: ${list[0]._id})`);
      }
    }
    console.log(`🏁 Cab Cleanup Finished: Removed ${cabsRemoved} duplicates.`);

    // 2. Hotels Deduplication (Match on name + city + mobile)
    console.log('\n--- Deduplicating Hotels ---');
    const pendingHotels = await Hotel.find({ status: 'Pending' });
    const hotelGroups = {};

    pendingHotels.forEach(hotel => {
      const nameNormalized = (hotel.name || hotel.hotelName || '').trim().toLowerCase();
      const cityNormalized = (hotel.city || '').trim().toLowerCase();
      const mobileNormalized = (hotel.mobile || '').trim();
      const key = `${nameNormalized}|${cityNormalized}|${mobileNormalized}`;
      if (!hotelGroups[key]) hotelGroups[key] = [];
      hotelGroups[key].push(hotel);
    });

    let hotelsRemoved = 0;
    for (const key in hotelGroups) {
      const list = hotelGroups[key];
      if (list.length > 1) {
        list.sort((a, b) => getCreationTime(a) - getCreationTime(b));
        const toDelete = list.slice(1);
        const idsToDelete = toDelete.map(item => item._id);
        
        await Hotel.deleteMany({ _id: { $in: idsToDelete } });
        hotelsRemoved += idsToDelete.length;
        console.log(`  Removed ${idsToDelete.length} duplicates for Hotel key: "${key}" (Kept oldest ID: ${list[0]._id})`);
      }
    }
    console.log(`🏁 Hotel Cleanup Finished: Removed ${hotelsRemoved} duplicates.`);

    // 3. Packages / TripBundles Deduplication (Match on name + partnerEmail)
    console.log('\n--- Deduplicating Packages ---');
    const pendingPackages = await TripBundle.find({ status: 'Pending' });
    const packageGroups = {};

    pendingPackages.forEach(pkg => {
      const nameNormalized = (pkg.name || '').trim().toLowerCase();
      const emailNormalized = (pkg.partnerEmail || '').trim().toLowerCase();
      const key = `${nameNormalized}|${emailNormalized}`;
      if (!packageGroups[key]) packageGroups[key] = [];
      packageGroups[key].push(pkg);
    });

    let packagesRemoved = 0;
    for (const key in packageGroups) {
      const list = packageGroups[key];
      if (list.length > 1) {
        list.sort((a, b) => getCreationTime(a) - getCreationTime(b));
        const toDelete = list.slice(1);
        const idsToDelete = toDelete.map(item => item._id);
        
        await TripBundle.deleteMany({ _id: { $in: idsToDelete } });
        packagesRemoved += idsToDelete.length;
        console.log(`  Removed ${idsToDelete.length} duplicates for Package key: "${key}" (Kept oldest ID: ${list[0]._id})`);
      }
    }
    console.log(`🏁 Package Cleanup Finished: Removed ${packagesRemoved} duplicates.`);

    // Overall Summary
    console.log('\n======================================');
    console.log('📊 DEDUPLICATION LOG SUMMARY');
    console.log(` - Cabs Removed:     ${cabsRemoved}`);
    console.log(` - Hotels Removed:   ${hotelsRemoved}`);
    console.log(` - Packages Removed: ${packagesRemoved}`);
    console.log('======================================');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB cleanly. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Deduplication Error:', err);
    process.exit(1);
  }
}

run();
