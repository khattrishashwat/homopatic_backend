const cron = require('node-cron');

exports.scheduleDailyReports = () => {
  cron.schedule('0 0 * * *', () => {
    console.log('Running daily report scheduler');
  });
};
