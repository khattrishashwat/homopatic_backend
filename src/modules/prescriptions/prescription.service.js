const Prescription = require('../../models/Prescription');
const Patient = require('../../models/Patient');
const Appointment = require('../../models/Appointment');
const { generatePrescriptionPdf } = require('../../utils/pdfGenerator');

exports.createPrescription = async (data) => {
  const patientQuery = data.patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: data.patientId }, { patientId: data.patientId }] }
    : { patientId: data.patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const prescription = await Prescription.create({
    patient: patient._id,
    appointment: data.appointmentId,
    doctor: data.doctorId,
    title: data.title || 'Prescription',
    medicines: data.medicines,
    notes: data.notes,
  });

  const pdfData = await generatePrescriptionPdf({
    ...prescription.toObject(),
    patient,
    doctor: data.doctorName ? { name: data.doctorName } : undefined,
  });

  prescription.pdf_url = pdfData.pdfUrl;
  prescription.pdf_path = pdfData.pdfPath;
  await prescription.save();

  return prescription;
};

exports.getPrescriptionById = async (id) => {
  const prescription = await Prescription.findById(id).populate('patient doctor appointment');
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }
  return prescription;
};

exports.updatePrescription = async (id, data) => {
  const prescription = await Prescription.findById(id);
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  Object.assign(prescription, {
    title: data.title ?? prescription.title,
    medicines: data.medicines ?? prescription.medicines,
    notes: data.notes ?? prescription.notes,
    status: data.status ?? prescription.status,
    updated_at: new Date(),
  });

  return prescription.save();
};

exports.deletePrescription = async (id) => {
  const prescription = await Prescription.findByIdAndDelete(id);
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }
  return prescription;
};

exports.listPrescriptions = async (filters = {}) => {
  const query = {};

  if (filters.patientId) {
    query.patient = filters.patientId;
  }

  if (filters.doctorId) {
    query.doctor = filters.doctorId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const prescriptions = await Prescription.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('patient doctor appointment');

  const total = await Prescription.countDocuments(query);

  return {
    data: prescriptions,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};
