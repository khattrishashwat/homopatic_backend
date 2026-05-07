const express = require('express');
const router = express.Router();
const settingsController = require('../../modules/settings/settings.controller');

router.get('/', settingsController.getPublicSettings);
module.exports = router;
