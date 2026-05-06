const cron = require('node-cron');
const slotService = require('../services/slotService');

const generateWeekendSlots = async () => {
  try {
    const result = await slotService.generateWeekendSlots();
    console.log('Weekend slot generation completed:', result);
  } catch (error) {
    console.error('Weekend slot generation failed:', error.message);
  }
};

exports.scheduleDailyReports = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily report scheduler');
  });
};

exports.scheduleSlotGeneration = () => {
  generateWeekendSlots();

  cron.schedule('0 0 * * *', generateWeekendSlots);
};
