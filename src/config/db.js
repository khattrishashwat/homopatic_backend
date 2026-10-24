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

    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log('MongoDB connected');
    } catch (primaryErr) {
      if (uri.includes('mongodb+srv') || uri.includes('mongodb.net')) {
        console.warn(`Primary MongoDB connection failed (${primaryErr.message}). Connecting to local MongoDB...`);
        const localUri = process.env.LOCAL_MONGO_URI || 'mongodb://127.0.0.1:27017/homeopathy_clinic';
        await mongoose.connect(localUri, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
          serverSelectionTimeoutMS: 5000,
        });
        console.log('Connected to local MongoDB (homeopathy_clinic)');
      } else {
        throw primaryErr;
      }
    }

    await ensureAdminUser();
  } catch (error) {
    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
