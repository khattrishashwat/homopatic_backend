const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const appointmentController = require('../../modules/appointments/appointment.controller');

router.post('/', appointmentController.createAppointment);
router.post('/verify-payment', appointmentController.verifyPayment);
router.get('/pricing', appointmentController.getPricingConfig);

router.use(authMiddleware.requireAuth);
router.get('/', appointmentController.getUserAppointments);
router.get('/:id', appointmentController.getAppointmentById);

module.exports = router;
