/**
 * seedMissingDestinationPackages.js
 * 
 * Standalone seeding script to add sample holiday packages for:
 * Dubai, Thailand, Jaipur, Udaipur, and Shimla.
 * Run manually via: node server/scripts/seedMissingDestinationPackages.js
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

const TripBundle = require('../models/TripBundle');

const samplePackages = [
  // Dubai
  {
    name: 'Dubai Skyline & Desert Safari Adventure',
    destination: 'Dubai',
    days: 5,
    nights: 4,
    price: 34999,
    inclusions: 'Luxury Hotel, Desert Safari, Burj Khalifa Entry, Dhow Cruise Dinner, Airport Transfer, Buffet Breakfast',
    images: [
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582730147233-0bb62cf4c3db?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'dubai.tours@makemytravel.com',
    packageId: 'MMT-PKG-DXB-101'
  },
  {
    name: 'Dubai Family Luxury Getaway',
    destination: 'Dubai',
    days: 7,
    nights: 6,
    price: 52999,
    inclusions: '5-Star Resort, Aquaventure Waterpark Access, Marina Yacht Cruise, Dubai Mall Tour, Daily Breakfast & Dinner',
    images: [
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'dubai.tours@makemytravel.com',
    packageId: 'MMT-PKG-DXB-102'
  },

  // Thailand
  {
    name: 'Bangkok & Phuket Tropical Explorer',
    destination: 'Thailand',
    days: 6,
    nights: 5,
    price: 28999,
    inclusions: 'Boutique Hotel, City Temple Tour, Phi Phi Islands Speedboat Tour, Daily Breakfast, Inter-City Flight',
    images: [
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'thai.explorer@makemytravel.com',
    packageId: 'MMT-PKG-THA-101'
  },
  {
    name: 'Krabi & Koh Samui Beach Retreat',
    destination: 'Thailand',
    days: 8,
    nights: 7,
    price: 41999,
    inclusions: 'Beachfront Resort, 4-Island Snorkeling Tour, Spa & Massage Voucher, Island Ferry Transfer, Daily Breakfast',
    images: [
      'https://images.unsplash.com/photo-1537956965359-7573183d1f57?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'thai.explorer@makemytravel.com',
    packageId: 'MMT-PKG-THA-102'
  },

  // Jaipur
  {
    name: 'Royal Heritage & Forts of Jaipur',
    destination: 'Jaipur',
    days: 3,
    nights: 2,
    price: 8499,
    inclusions: 'Heritage Hotel, Private AC Cab Guide, Amer Fort Elephant Ride, City Palace Entry, Rajasthani Dinner',
    images: [
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'rajasthan.royal@makemytravel.com',
    packageId: 'MMT-PKG-JAI-101'
  },
  {
    name: 'Jaipur Cultural & Shopping Tour',
    destination: 'Jaipur',
    days: 4,
    nights: 3,
    price: 11999,
    inclusions: 'Haveli Stay, Chokhi Dhani Ethnic Village Tour, Johari Bazaar Guided Tour, Airport Transfer, Daily Breakfast',
    images: [
      'https://images.unsplash.com/photo-1603262110263-fb0112e7cc33?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1534759846116-5799c33ce22a?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'rajasthan.royal@makemytravel.com',
    packageId: 'MMT-PKG-JAI-102'
  },

  // Udaipur
  {
    name: 'Romantic Venice of the East Escapade',
    destination: 'Udaipur',
    days: 4,
    nights: 3,
    price: 13499,
    inclusions: 'Lake-View Hotel, Lake Pichola Boat Ride, Sajjangarh Monsoon Palace Visit, Private Cab Tour, Daily Breakfast',
    images: [
      'https://images.unsplash.com/photo-1595815771614-ade9d652a65d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1605649487212-47bdab064df7?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'udaipur.lakes@makemytravel.com',
    packageId: 'MMT-PKG-UDI-101'
  },
  {
    name: 'Udaipur Luxury Lakefront Experience',
    destination: 'Udaipur',
    days: 5,
    nights: 4,
    price: 24999,
    inclusions: 'Palace Resort Stay, Jag Mandir Lunch, Jagdish Temple Guided Walk, Vintage Car Museum Entry, Daily Meals',
    images: [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'udaipur.lakes@makemytravel.com',
    packageId: 'MMT-PKG-UDI-102'
  },

  // Shimla
  {
    name: 'Shimla Snowy Peaks & Ridge Walk',
    destination: 'Shimla',
    days: 3,
    nights: 2,
    price: 9499,
    inclusions: 'Mountain View Resort, Kufri Excursion, Mall Road Tour, Toy Train Experience, Daily Breakfast',
    images: [
      'https://images.unsplash.com/photo-1562691763-7186178553e1?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1588722971206-ad4b975d04c1?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'shimla.hills@makemytravel.com',
    packageId: 'MMT-PKG-SHM-101'
  },
  {
    name: 'Shimla & Chail Winter Getaway',
    destination: 'Shimla',
    days: 5,
    nights: 4,
    price: 14999,
    inclusions: 'Premium Cottage Stay, Chail Palace Tour, Jakhoo Temple Trek Guide, Private Cab Transfers, Daily Breakfast & Dinner',
    images: [
      'https://images.unsplash.com/photo-1548263514-a91d43f829e2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1596701062351-dfc799c4e8c0?auto=format&fit=crop&w=800&q=80'
    ],
    status: 'Approved',
    partnerEmail: 'shimla.hills@makemytravel.com',
    packageId: 'MMT-PKG-SHM-102'
  }
];

async function seed() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined in the environment variables.');
    }

    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    const summary = {};

    console.log('\n--- Seeding Missing Destination Packages ---');
    for (const pkgData of samplePackages) {
      // Check if duplicate sample package already exists by packageId or name
      const existing = await TripBundle.findOne({ 
        $or: [{ name: pkgData.name }, { packageId: pkgData.packageId }] 
      });

      if (!existing) {
        await TripBundle.create(pkgData);
        summary[pkgData.destination] = (summary[pkgData.destination] || 0) + 1;
        console.log(`✅ Created package: "${pkgData.name}" for destination: "${pkgData.destination}"`);
      } else {
        console.log(`ℹ️ Package "${pkgData.name}" already exists, skipping.`);
      }
    }

    console.log('\n======================================');
    console.log('📊 SEEDING LOG SUMMARY');
    Object.entries(summary).forEach(([dest, count]) => {
      console.log(` - ${dest}: Created ${count} packages`);
    });
    if (Object.keys(summary).length === 0) {
      console.log(' - No new packages created (all already seeded).');
    }
    console.log('======================================');

    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB cleanly. Exiting.');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding Error:', err);
    process.exit(1);
  }
}

seed();
