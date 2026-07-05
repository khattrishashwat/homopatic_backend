const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URL;
    if (!uri) {
      throw new Error('MONGO_URI or MONGODB_URL environment variable is required');
    }

    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected'); 
  } catch (error) {
    throw new Error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
