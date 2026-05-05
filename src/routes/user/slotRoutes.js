const express = require('express');
const router = express.Router();
const slotService = require('../../services/slotService');

router.get('/', async (req, res, next) => {
  try {
    const slots = await slotService.getAvailableSlots();
    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
