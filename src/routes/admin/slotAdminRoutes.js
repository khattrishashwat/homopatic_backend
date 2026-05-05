const express = require('express');
const router = express.Router();
const slotAdminController = require('../../controllers/admin/slotAdminController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware.requireAdmin);
router.post('/', slotAdminController.createSlot);
router.get('/', slotAdminController.listSlots);
router.patch('/available-all', slotAdminController.makeAllSlotsAvailable);
router.patch('/:id', slotAdminController.updateSlot);

module.exports = router;
