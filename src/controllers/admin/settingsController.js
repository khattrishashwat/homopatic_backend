const SiteSettings = require('../../models/SiteSettings');
const s3Service = require('../../services/s3Service');

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

    // Handle logo upload (S3 only)
    if (req.files?.logo?.[0]) {
      const logoFile = req.files.logo[0];
      if (settings.logo_s3_key) {
        try {
          await s3Service.deleteFile(settings.logo_s3_key);
        } catch (err) {
          console.warn('Failed to delete old logo from S3:', err.message);
        }
      }

      const s3Result = await s3Service.uploadFile({
        buffer: logoFile.buffer,
        originalname: logoFile.originalname,
        mimetype: logoFile.mimetype,
        module: 'settings',
        category: 'logo',
        recordId: 'site',
        metadata: { field: 'logo' },
      });
      settings.logo_url = s3Result.url;
      settings.logo_s3_key = s3Result.key;
      settings.logo_path = null;
    }

    // Handle favicon upload (S3 only)
    if (req.files?.favicon?.[0]) {
      const faviconFile = req.files.favicon[0];
      if (settings.favicon_s3_key) {
        try {
          await s3Service.deleteFile(settings.favicon_s3_key);
        } catch (err) {
          console.warn('Failed to delete old favicon from S3:', err.message);
        }
      }

      const s3Result = await s3Service.uploadFile({
        buffer: faviconFile.buffer,
        originalname: faviconFile.originalname,
        mimetype: faviconFile.mimetype,
        module: 'settings',
        category: 'favicon',
        recordId: 'site',
        metadata: { field: 'favicon' },
      });
      settings.favicon_url = s3Result.url;
      settings.favicon_s3_key = s3Result.key;
      settings.favicon_path = null;
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
      'chatbot_settings',
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

    const existing = settings.appointment_settings ? (typeof settings.appointment_settings.toObject === 'function' ? settings.appointment_settings.toObject() : settings.appointment_settings) : {};
    const incomingPricing = req.body.pricing || {};
    const online15 = incomingPricing.online_15_days ?? incomingPricing.online_7_days ?? existing.pricing?.online_15_days ?? existing.pricing?.online_7_days ?? 500;
    settings.appointment_settings = {
      ...existing,
      ...req.body,
      pricing: {
        ...(existing.pricing || { online_15_days: 500, online_7_days: 500, online_1_month: 1000, offline: 200, delivery_included: true }),
        ...incomingPricing,
        online_15_days: Number(online15),
        online_7_days: Number(online15),
      },
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

    res.json({ success: true, data: settings.payment_settings });
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

exports.getChatbotSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    res.json({
      success: true,
      data: settings.chatbot_settings || {
        enabled: true,
        welcome_message: "Hi! 👋 Welcome to MD's Homoeopathy. How can I assist your health journey today?",
        suggested_questions: [],
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateChatbotSettings = async (req, res, next) => {
  try {
    let settings = await SiteSettings.findOne();

    if (!settings) {
      settings = await SiteSettings.create({
        site_name: 'Homeopathy Clinic',
      });
    }

    settings.chatbot_settings = {
      ...settings.chatbot_settings,
      ...req.body,
    };

    settings.updated_at = new Date();
    settings.updated_by = req.user._id;

    await settings.save();

    res.json({ success: true, data: settings.chatbot_settings });
  } catch (error) {
    next(error);
  }
};
