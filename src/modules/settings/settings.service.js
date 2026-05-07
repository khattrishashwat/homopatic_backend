const SiteSettings = require('../../models/SiteSettings');

exports.getSiteSettings = async () => {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({ site_name: 'Homeopathy Clinic' });
  }
  return settings;
};

exports.updateSiteSettings = async (data) => {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = new SiteSettings();
  }
  Object.assign(settings, data);
  settings.updated_at = new Date();
  return settings.save();
};
