require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('./models/User');

async function promote() {
  try {
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not found in environment');
      process.exit(1);
    }
    
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB Atlas');

    const email = 'mharshvardhan20@gmail.com';
    let user = await User.findOne({ email });

    if (user) {
      console.log('User found in Atlas, promoting to admin...');
      user.role = 'admin';
      user.verified = true;
      user.password = 'Admin@1234'; // reset/update password
      await user.save();
      console.log('✅ Existing user promoted to admin in MongoDB Atlas!');
    } else {
      console.log('User not found in Atlas, creating admin user...');
      user = await User.create({
        name: 'Admin',
        email: email,
        password: 'Admin@1234',
        role: 'admin',
        authProvider: 'credentials',
        verified: true
      });
      console.log('✅ Created new admin user in MongoDB Atlas!');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error executing promotion:', err);
    process.exit(1);
  }
}

promote();
