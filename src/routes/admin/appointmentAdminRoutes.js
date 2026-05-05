const express = require('express');
const router = express.Router();
const appointmentAdminController = require('../../controllers/admin/appointmentAdminController');
const authMiddleware = require('../../middlewares/authMiddleware');

router.use(authMiddleware.requireAdmin);
router.get('/', appointmentAdminController.listAppointments);
router.patch('/:id/status', appointmentAdminController.updateAppointmentStatus);

module.exports = router;
