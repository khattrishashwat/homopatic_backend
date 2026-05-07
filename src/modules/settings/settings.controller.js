const settingsService = require('./settings.service');

exports.getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSiteSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSiteSettings(req.body);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};
