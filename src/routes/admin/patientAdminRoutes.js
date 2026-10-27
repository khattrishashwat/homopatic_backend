const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const patientController = require('../../modules/patients/patient.controller');
const multer = require('../../utils/multer');

router.use(authMiddleware.requireAdmin);

// Excel import & export routes (placed before /:id)
router.post('/import/excel', multer.single('file'), patientController.importExcel);
router.get('/export/excel', patientController.exportExcel);
router.get('/sample-template', patientController.downloadSampleTemplate);

router.post('/', patientController.createPatient);
router.post('/family', patientController.createFamily);
router.post('/bulk-import', patientController.bulkImport);
router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatientById);
router.patch('/:id', patientController.updatePatient);
router.put('/:id', patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);
router.post('/link-family', patientController.linkFamily);
router.get('/:id/profile', patientController.getPatientProfile);

module.exports = router;
