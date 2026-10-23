const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const medicalRecordController = require('../../modules/medicalRecords/medicalRecord.controller');
const patientUpload = require('../../middlewares/patientUploadMiddleware');

router.use(authMiddleware.requireAuth);

router.post('/', patientUpload.uploadSingle('record'), medicalRecordController.uploadRecord);
router.get('/', medicalRecordController.listRecords);
router.get('/:id', medicalRecordController.getRecordById);
router.get('/:id/file', medicalRecordController.downloadRecordFile);
router.get('/:id/download', medicalRecordController.downloadRecordFile);

module.exports = router;
