const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const patientController = require('../../modules/patients/patient.controller');

router.use(authMiddleware.requireAuth);
router.post('/', patientController.createPatient);
router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatientById);
router.get('/:id/profile', patientController.getPatientProfile);
router.patch('/:id', patientController.updatePatient);

module.exports = router;
