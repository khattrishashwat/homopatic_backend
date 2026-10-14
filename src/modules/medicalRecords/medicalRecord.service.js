const MedicalRecord = require('../../models/MedicalRecord');
const Patient = require('../../models/Patient');
const fs = require('fs').promises;

exports.uploadRecord = async ({ patientId, appointmentId, uploadedBy, file, title, description, notes, recordDate }) => {
  const patientQuery = patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: patientId }, { patientId }] }
    : { patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  return MedicalRecord.create({
    patient: patient._id,
    appointment: appointmentId,
    uploaded_by: uploadedBy,
    title: title || file.originalname,
    description,
    file_url: `/uploads/${file.filename}`,
    file_path: file.path,
    file_type: file.mimetype,
    record_date: recordDate || new Date(),
    notes,
  });
};

exports.uploadBulkRecords = async ({ patientId, appointmentId, uploadedBy, files, title, description, notes, recordDate }) => {
  const patientQuery = patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: patientId }, { patientId }] }
    : { patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  const createdRecords = [];
  for (const file of files) {
    const record = await MedicalRecord.create({
      patient: patient._id,
      appointment: appointmentId,
      uploaded_by: uploadedBy,
      title: title ? `${title} - ${file.originalname}` : file.originalname,
      description,
      file_url: `/uploads/${file.filename}`,
      file_path: file.path,
      file_type: file.mimetype,
      record_date: recordDate || new Date(),
      notes,
    });
    createdRecords.push(record);
  }

  return createdRecords;
};

exports.getRecordById = async (id) => {
  const record = await MedicalRecord.findById(id).populate('patient appointment uploaded_by');
  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }
  return record;
};

exports.listRecords = async (filters = {}) => {
  const query = {};
  if (filters.patientId) {
    const patientQuery = filters.patientId?.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: filters.patientId }, { patientId: filters.patientId }] }
      : { patientId: filters.patientId };
    const patient = await Patient.findOne(patientQuery);
    if (patient) {
      query.patient = patient._id;
    } else {
      query.patient = filters.patientId;
    }
  }
  if (filters.appointmentId) {
    query.appointment = filters.appointmentId;
  }
  if (filters.file_type) {
    query.file_type = filters.file_type;
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 100;
  const skip = (page - 1) * limit;

  const records = await MedicalRecord.find(query)
    .sort({ record_date: -1, created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('patient appointment uploaded_by');

  const total = await MedicalRecord.countDocuments(query);

  return {
    data: records,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

exports.deleteRecord = async (id) => {
  const record = await MedicalRecord.findByIdAndDelete(id);
  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  if (record.file_path) {
    try {
      await fs.unlink(record.file_path);
    } catch (error) {
      console.error('Failed to delete medical record file:', error);
    }
  }

  return record;
};
