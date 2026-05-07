const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const patientController = require('../../modules/patients/patient.controller');

router.use(authMiddleware.requireAdmin);
router.post('/', patientController.createPatient);
router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatientById);
router.patch('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);
router.post('/link-family', patientController.linkFamily);
router.get('/:id/profile', patientController.getPatientProfile);

module.exports = router;
