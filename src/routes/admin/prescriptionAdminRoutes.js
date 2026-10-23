const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/authMiddleware');
const prescriptionController = require('../../modules/prescriptions/prescription.controller');

router.use(authMiddleware.requireAdmin);

router.post('/', prescriptionController.createPrescription);
router.get('/', prescriptionController.listPrescriptions);
router.get('/:id', prescriptionController.getPrescriptionById);
router.get('/:id/image', prescriptionController.getPrescriptionImage);
router.get('/:id/pdf', prescriptionController.downloadPrescriptionPdf);
router.patch('/:id', prescriptionController.updatePrescription);
router.delete('/:id', prescriptionController.deletePrescription);

module.exports = router;
