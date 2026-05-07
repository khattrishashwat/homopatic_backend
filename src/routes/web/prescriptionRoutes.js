const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const prescriptionController = require('../../modules/prescriptions/prescription.controller');

router.use(authMiddleware.requireAuth);
router.post('/', prescriptionController.createPrescription);
router.get('/', prescriptionController.listPrescriptions);
router.get('/:id', prescriptionController.getPrescriptionById);

module.exports = router;
