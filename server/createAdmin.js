/**
 * createAdmin.js
 * Run this ONCE to create an admin user in MongoDB:
 *   node createAdmin.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const User = require('./models/User');

async function createAdmin() {
  try {
    try {
      await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
      console.log('✅ Connected to MongoDB Atlas');
    } catch (connErr) {
      console.warn('⚠️ Could not connect to MongoDB Atlas. Creating admin in local JSON database fallback instead!');
    }

    const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
    const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error('❌ Error: Environment variables ADMIN_EMAIL and ADMIN_SEED_PASSWORD must be defined.');
      process.exit(1);
    }

    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
      // Ensure role is admin
      admin.role = 'admin';
      admin.verified = true;
      await admin.save();
      console.log('✅ Existing user promoted to admin:', ADMIN_EMAIL);
    } else {
      admin = await User.create({
        name: 'Admin',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin',
        authProvider: 'credentials',
        verified: true
      });
      console.log('✅ Admin user created:', ADMIN_EMAIL);
    }

    console.log('\n🔐 Login credentials for admin-login.html:');
    console.log('   Email:    ', ADMIN_EMAIL);
    console.log('   Password: ', ADMIN_PASSWORD);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
