const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const slotController = require('../../modules/slots/slot.controller');

router.use(authMiddleware.requireAdmin);

// Schedule management (Online & Offline independent)
router.get('/schedule/:type', slotController.getSchedule);
router.put('/schedule/:type', slotController.updateSchedule);
router.post('/schedule/:type/override', slotController.setDateOverride);
router.delete('/schedule/:type/override/:date', slotController.removeDateOverride);
router.get('/schedule/:type/preview', slotController.previewSlots);

router.post('/', slotController.createSlot);
router.get('/', slotController.getAllSlots);
router.patch('/available-all', slotController.makeAllSlotsAvailable);
router.post('/generate-weekends', slotController.generateWeekendSlots);
router.patch('/:id', slotController.updateSlot);

module.exports = router;
