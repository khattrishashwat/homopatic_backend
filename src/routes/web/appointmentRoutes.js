const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const appointmentController = require('../../modules/appointments/appointment.controller');

router.use(authMiddleware.requireAuth);
router.post('/', appointmentController.createAppointment);
router.get('/', appointmentController.getUserAppointments);
router.get('/:id', appointmentController.getAppointmentById);

module.exports = router;
