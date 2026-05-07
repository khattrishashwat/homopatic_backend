const patientService = require('./patient.service');
const validation = require('./patient.validation');

exports.createPatient = async (req, res, next) => {
  try {
    validation.validatePatientPayload(req.body);
    const patient = await patientService.createPatient({
      userId: req.user?._id,
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      gender: req.body.gender,
      dob: req.body.dob,
      address: req.body.address,
      emergency_contact: req.body.emergency_contact,
      family_group: req.body.family_group,
      medical_history: req.body.medical_history,
      notes: req.body.notes,
    });
    res.status(201).json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.updatePatient = async (req, res, next) => {
  try {
    const patient = await patientService.updatePatient(req.params.id, req.body);
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.getPatientById = async (req, res, next) => {
  try {
    const patient = await patientService.getPatientById(req.params.id);
    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

exports.listPatients = async (req, res, next) => {
  try {
    const result = await patientService.listPatients(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.linkFamily = async (req, res, next) => {
  try {
    validation.validateFamilyLink(req.body);
    const result = await patientService.linkFamily(req.body.primaryPatientId, req.body.familyMemberId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getPatientProfile = async (req, res, next) => {
  try {
    const profile = await patientService.getPatientProfile(req.params.id);
    res.json({ success: true, data: profile });
  } catch (error) {
    next(error);
  }
};
