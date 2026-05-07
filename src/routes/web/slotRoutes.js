const express = require('express');
const router = express.Router();
const slotController = require('../../modules/slots/slot.controller');

router.get('/', slotController.getAvailableSlots);
module.exports = router;
