const express = require('express');
const router = express.Router();
const appointmentController = require('../../controllers/user/appointmentController');

router.post('/', appointmentController.bookAppointment);
router.get('/', appointmentController.getAppointments);

module.exports = router;
