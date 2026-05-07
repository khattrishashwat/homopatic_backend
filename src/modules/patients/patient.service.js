const Patient = require('../../models/Patient');
const Appointment = require('../../models/Appointment');
const Prescription = require('../../models/Prescription');
const MedicalRecord = require('../../models/MedicalRecord');
const Payment = require('../../models/Payment');
const { v4: uuidv4 } = require('uuid');

exports.createPatient = async (data) => {
  const patientId = data.patientId || `PAT-${uuidv4().split('-')[0].toUpperCase()}`;

  const existing = await Patient.findOne({ $or: [{ email: data.email }, { phone: data.phone }, { patientId }] });
  if (existing) {
    const error = new Error('Patient with same email, phone, or patientId already exists');
    error.statusCode = 400;
    throw error;
  }

  return Patient.create({
    patientId,
    user: data.userId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    gender: data.gender,
    dob: data.dob,
    address: data.address,
    emergency_contact: data.emergency_contact,
    family_group: data.family_group,
    medical_history: data.medical_history || [],
    notes: data.notes,
  });
};

exports.updatePatient = async (id, data) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  Object.assign(patient, data);
  patient.updated_at = new Date();
  return patient.save();
};

exports.getPatientById = async (id) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: id }, { patientId: id }] } : { patientId: id };
  const patient = await Patient.findOne(query).populate('family_members');
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }
  return patient;
};

exports.listPatients = async (filters = {}) => {
  const query = { active: true };

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { phone: { $regex: filters.search, $options: 'i' } },
      { patientId: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.family_group) {
    query.family_group = filters.family_group;
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const patients = await Patient.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('family_members');

  const total = await Patient.countDocuments(query);

  return {
    data: patients,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

exports.linkFamily = async (primaryPatientId, familyMemberId) => {
  const primary = await this.getPatientById(primaryPatientId);
  const member = await this.getPatientById(familyMemberId);

  if (primary._id.equals(member._id)) {
    const error = new Error('A patient cannot be linked to themselves');
    error.statusCode = 400;
    throw error;
  }

  if (!primary.family_members.some((id) => id.equals(member._id))) {
    primary.family_members.push(member._id);
  }
  if (!member.family_members.some((id) => id.equals(primary._id))) {
    member.family_members.push(primary._id);
  }

  await primary.save();
  await member.save();

  return { primary, member };
};

exports.getPatientProfile = async (patientId) => {
  const patient = await this.getPatientById(patientId);

  const appointments = await Appointment.find({ patient: patient._id }).populate('slot');
  const prescriptions = await Prescription.find({ patient: patient._id });
  const records = await MedicalRecord.find({ patient: patient._id });
  const payments = await Payment.find({ patient: patient._id });

  return {
    patient,
    appointments,
    prescriptions,
    medical_records: records,
    payments,
  };
};
