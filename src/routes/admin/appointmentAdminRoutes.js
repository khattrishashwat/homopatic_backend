const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const appointmentController = require('../../modules/appointments/appointment.controller');

router.use(authMiddleware.requireAdmin);
router.get('/', appointmentController.adminListAppointments);
router.patch('/:id/status', appointmentController.adminUpdateStatus);
router.patch('/:id/reschedule', appointmentController.adminRescheduleAppointment);
router.patch('/:id/consultation-mode', appointmentController.adminSetConsultationMode);
router.patch('/:id/payment-status', appointmentController.adminUpdatePaymentStatus);
router.patch('/:id/complete', appointmentController.adminMarkComplete);
router.patch('/:id/missed', appointmentController.adminMarkMissed);

module.exports = router;
