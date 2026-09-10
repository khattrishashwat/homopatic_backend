const mongoose = require('mongoose');
const User = require('../models/User');

const ensureAdminUser = async () => {
  try {
    const existingAdmin = await User.findOne({
      $or: [
        { role: 'admin' },
        { email: 'admin@yopmail.com' },
      ],
    });

    if (!existingAdmin) {
      const admin = new User({
        name: 'Admin',
        email: 'admin@yopmail.com',
        phone: '',
        role: 'admin',
        password: 'Admin@2810',
      });
      await admin.save();
      console.log('Default admin user auto-seeded: admin@yopmail.com');
    }
  } catch (err) {
    console.warn('Could not auto-seed admin user:', err.message);
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGODB_URL;
    if (!uri) {
      throw new Error('MONGO_URI or MONGODB_URL environment variable is required');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
    await ensureAdminUser();
  } catch (error) {
    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
