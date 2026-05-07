const prescriptionService = require('./prescription.service');
const validation = require('./prescription.validation');

exports.createPrescription = async (req, res, next) => {
  try {
    validation.validateCreatePrescription(req.body);
    const prescription = await prescriptionService.createPrescription({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      doctorId: req.user?._id,
      doctorName: req.user?.name,
      title: req.body.title,
      medicines: req.body.medicines,
      notes: req.body.notes,
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

exports.listPrescriptions = async (req, res, next) => {
  try {
    const result = await prescriptionService.listPrescriptions(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};
