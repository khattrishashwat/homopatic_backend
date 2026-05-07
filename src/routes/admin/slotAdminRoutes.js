const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const slotController = require('../../modules/slots/slot.controller');

router.use(authMiddleware.requireAdmin);
router.post('/', slotController.createSlot);
router.get('/', slotController.getAllSlots);
router.patch('/available-all', slotController.makeAllSlotsAvailable);
router.post('/generate-weekends', slotController.generateWeekendSlots);
router.patch('/:id', slotController.updateSlot);

module.exports = router;
