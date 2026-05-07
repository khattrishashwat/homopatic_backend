const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const medicalRecordController = require('../../modules/medicalRecords/medicalRecord.controller');
const multer = require('../../utils/multer');

router.use(authMiddleware.requireAdmin);
router.post('/', multer.single('record'), medicalRecordController.uploadRecord);
router.get('/', medicalRecordController.listRecords);
router.get('/:id', medicalRecordController.getRecordById);
router.delete('/:id', medicalRecordController.deleteRecord);

module.exports = router;
