const prescriptionService = require('./prescription.service');
const validation = require('./prescription.validation');
const path = require('path');

exports.createPrescription = async (req, res, next) => {
  try {
    validation.validateCreatePrescription(req.body);
    const prescription = await prescriptionService.createPrescription({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      doctorId: req.user?._id,
      doctorName: req.user?.name,
      title: req.body.title,
      prescriptionDate: req.body.prescriptionDate,
      vitals: req.body.vitals,
      medicines: req.body.medicines,
      advice: req.body.advice,
      notes: req.body.notes,
      imageData: req.body.imageData,
      imageUrl: req.body.imageUrl || req.body.image_url,
      image_s3_key: req.body.image_s3_key || req.body.imageS3Key,
      image_s3_bucket: req.body.image_s3_bucket || req.body.imageS3Bucket,
    });
    res.status(201).json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

exports.getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.getPrescriptionById(req.params.id);
    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

exports.updatePrescription = async (req, res, next) => {
  try {
    const prescription = await prescriptionService.updatePrescription(req.params.id, req.body);
    res.json({ success: true, data: prescription });
  } catch (error) {
    next(error);
  }
};

exports.deletePrescription = async (req, res, next) => {
  try {
    await prescriptionService.deletePrescription(req.params.id);
    res.json({ success: true, message: 'Prescription deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.listPrescriptions = async (req, res, next) => {
  try {
    const result = await prescriptionService.listPrescriptions(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Streams or serves the prescription PDF directly from S3 with authorization checks.
 */
exports.downloadPrescriptionPdf = async (req, res, next) => {
  try {
    const fileResult = await prescriptionService.getPrescriptionPdfStream(req.params.id, req.user);
    const safeFilename = path.basename(fileResult.filename || 'prescription.pdf').replace(/"/g, '');

    res.setHeader('Content-Type', fileResult.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    if (fileResult.type === 's3' && fileResult.stream) {
      if (fileResult.contentLength) {
        res.setHeader('Content-Length', fileResult.contentLength);
      }
      fileResult.stream.on('error', (streamErr) => {
        console.error('[S3 Prescription Stream Error]:', streamErr.message);
        if (!res.headersSent) {
          res.status(502).json({ success: false, message: 'Error streaming prescription PDF' });
        }
      });
      return fileResult.stream.pipe(res);
    }

    res.status(404).json({ success: false, message: 'Prescription PDF not available' });
  } catch (error) {
    next(error);
  }
};

/**
 * Streams or serves the prescription slip image directly from S3 with authorization checks.
 */
exports.getPrescriptionImage = async (req, res, next) => {
  try {
    const fileResult = await prescriptionService.getPrescriptionImageStream(req.params.id, req.user);
    const safeFilename = path.basename(fileResult.filename || 'prescription.jpg').replace(/"/g, '');

    res.setHeader('Content-Type', fileResult.contentType || 'image/jpeg');
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    if (fileResult.type === 's3' && fileResult.stream) {
      if (fileResult.contentLength) {
        res.setHeader('Content-Length', fileResult.contentLength);
      }
      fileResult.stream.on('error', (streamErr) => {
        console.error('[S3 Prescription Image Stream Error]:', streamErr.message);
        if (!res.headersSent) {
          res.status(502).json({ success: false, message: 'Error streaming prescription image' });
        }
      });
      return fileResult.stream.pipe(res);
    }

    res.status(404).json({ success: false, message: 'Prescription image not available' });
  } catch (error) {
    next(error);
  }
};
