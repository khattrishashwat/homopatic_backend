const SiteSettings = require('../../models/SiteSettings');
const fs = require('fs').promises;

exports.getSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    // If no settings exist, create default ones
    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSiteSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = new SiteSettings();
    }

    // Handle logo upload
    if (req.files?.logo) {
      if (settings.logo_path) {
        try {
          await fs.unlink(settings.logo_path);
        } catch (err) {
          console.error('Failed to delete old logo:', err);
        }
      }
      settings.logo_url = `/uploads/${req.files.logo[0].filename}`;
      settings.logo_path = req.files.logo[0].path;
    }

    // Handle favicon upload
    if (req.files?.favicon) {
      if (settings.favicon_path) {
        try {
          await fs.unlink(settings.favicon_path);
        } catch (err) {
          console.error('Failed to delete old favicon:', err);
        }
      }
      settings.favicon_url = `/uploads/${req.files.favicon[0].filename}`;
      settings.favicon_path = req.files.favicon[0].path;
    }

    // Update text fields
    const allowedFields = [
      'site_name',
      'site_url',
      'site_description',
      'phone',
      'email',
      'address',
      'city',
      'state',
      'postal_code',
      'country',
      'about_us',
      'mission',
      'vision',
      'social_links',
      'business_hours',
      'appointment_settings',
      'payment_settings',
      'notification_settings',
      'seo_settings',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field];
      }
    });

    settings.updated_at = new Date();
    settings.updated_by = req.user._id;

    await settings.save();

    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.getAppointmentSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    res.json({ success: true, data: settings.appointment_settings });
  } catch (error) {
    next(error);
  }
};

exports.updateAppointmentSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    settings.appointment_settings = {
      ...settings.appointment_settings,
      ...req.body,
    };

    settings.updated_at = new Date();
    settings.updated_by = req.user._id;

    await settings.save();

    res.json({ success: true, data: settings.appointment_settings });
  } catch (error) {
    next(error);
  }
};

exports.getPaymentSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    // Don't expose secret keys
    const paymentSettings = { ...settings.payment_settings };
    delete paymentSettings.razorpay_key_id;

    res.json({ success: true, data: paymentSettings });
  } catch (error) {
    next(error);
  }
};

exports.updatePaymentSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    settings.payment_settings = {
      ...settings.payment_settings,
      ...req.body,
    };

    settings.updated_at = new Date();
    settings.updated_by = req.user._id;

    await settings.save();

    res.json({ success: true, data: settings.payment_settings });
  } catch (error) {
    next(error);
  }
};

exports.getNotificationSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    res.json({ success: true, data: settings.notification_settings });
  } catch (error) {
    next(error);
  }
};

exports.updateNotificationSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    settings.notification_settings = {
      ...settings.notification_settings,
      ...req.body,
    };

    settings.updated_at = new Date();
    settings.updated_by = req.user._id;

    await settings.save();

    res.json({ success: true, data: settings.notification_settings });
  } catch (error) {
    next(error);
  }
};
