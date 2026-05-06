const dotenv = require('dotenv');
dotenv.config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const scheduler = require('./src/utils/scheduler');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  scheduler.scheduleSlotGeneration();

  const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Set a different PORT in .env or stop the running server.`);
      process.exit(1);
    }

    console.error('Server error:', error.message);
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
