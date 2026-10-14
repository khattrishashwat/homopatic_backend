const patientService = require('./patient.service');
const validation = require('./patient.validation');

exports.createPatient = async (req, res, next) => {
  try {
    validation.validatePatientPayload(req.body);
    const patient = await patientService.createPatient({
      userId: req.user?._id,
      clinicCode: req.body.clinicCode || req.body.clinic_code || '01',
      relationship: req.body.relationship,
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

exports.deletePatient = async (req, res, next) => {
  try {
    await patientService.deletePatient(req.params.id);
    res.json({ success: true, message: 'Patient deleted successfully' });
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

exports.createFamily = async (req, res, next) => {
  try {
    const result = await patientService.createFamily({
      ...req.body,
      userId: req.user?._id,
    });
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.bulkImport = async (req, res, next) => {
  try {
    const { patients } = req.body;
    const result = await patientService.bulkImport(patients, req.user?._id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
