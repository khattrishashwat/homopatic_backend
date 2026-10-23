const MedicalRecord = require('../../models/MedicalRecord');
const Patient = require('../../models/Patient');
const s3Service = require('../../services/s3Service');
const path = require('path');

async function attachPresignedUrl(record) {
  if (!record) return record;
  const doc = record.toObject ? record.toObject() : { ...record };

  if ((doc.storage_type === 's3' || doc.s3_key) && doc.s3_key) {
    try {
      const presignedUrl = await s3Service.getPresignedDownloadUrl(doc.s3_key, {
        expiresIn: 900, // 15 minutes validity
        downloadFilename: doc.original_filename || doc.title,
      });
      doc.file_url = presignedUrl;
    } catch (err) {
      console.warn(`[Presigned URL generation warning for record ${doc._id}]:`, err.message);
      doc.file_url = `/api/admin/medical-records/${doc._id}/file`;
    }
  }

  return doc;
}

exports.uploadRecord = async ({
  patientId,
  appointmentId,
  uploadedBy,
  file,
  title,
  description,
  notes,
  recordDate,
}) => {
  const patientQuery = patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: patientId }, { patientId }] }
    : { patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  if (!file) {
    const error = new Error('A medical record file is required');
    error.statusCode = 400;
    throw error;
  }

  // S3 only for patient documents
  let s3Result;
  try {
    s3Result = await s3Service.uploadPatientFile({
      buffer: file.buffer,
      filePath: file.path,
      patientId: patient.patientId || patient._id,
      category: 'medical-records',
      originalname: file.originalname || 'document.bin',
      mimetype: file.mimetype,
      metadata: {
        patientId: String(patient.patientId || patient._id),
        appointmentId: appointmentId ? String(appointmentId) : '',
      },
    });
  } catch (s3Error) {
    console.error('[MedicalRecord S3 Upload Failed]:', s3Error.message);
    throw s3Error;
  }

  try {
    const record = await MedicalRecord.create({
      patient: patient._id,
      appointment: appointmentId || undefined,
      uploaded_by: uploadedBy || undefined,
      title: title || file.originalname,
      description,
      file_url: s3Result.url || s3Result.canonicalUrl,
      file_path: `s3://${s3Result.bucket}/${s3Result.key}`,
      file_type: file.mimetype,
      storage_type: 's3',
      s3_key: s3Result.key,
      s3_bucket: s3Result.bucket,
      original_filename: file.originalname,
      file_size: s3Result.size,
      record_date: recordDate || new Date(),
      notes,
    });

    return await attachPresignedUrl(record);
  } catch (dbError) {
    // Partial failure safety: clean up the uploaded S3 object if MongoDB insertion fails
    console.error('[DB Insert Failed after S3 Upload - Cleaning up S3 object]:', dbError.message);
    await s3Service.deletePatientFile(s3Result.key).catch(() => {});
    throw dbError;
  }
};

exports.uploadBulkRecords = async ({
  patientId,
  appointmentId,
  uploadedBy,
  files,
  title,
  description,
  notes,
  recordDate,
}) => {
  const patientQuery = patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: patientId }, { patientId }] }
    : { patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  if (!files || files.length === 0) {
    const error = new Error('At least one medical record file is required');
    error.statusCode = 400;
    throw error;
  }

  const createdRecords = [];

  for (const file of files) {
    const recordTitle = title ? `${title} - ${file.originalname}` : file.originalname;

    let s3Result;
    try {
      s3Result = await s3Service.uploadPatientFile({
        buffer: file.buffer,
        filePath: file.path,
        patientId: patient.patientId || patient._id,
        category: 'medical-records',
        originalname: file.originalname || 'document.bin',
        mimetype: file.mimetype,
        metadata: {
          patientId: String(patient.patientId || patient._id),
          appointmentId: appointmentId ? String(appointmentId) : '',
        },
      });
    } catch (uploadError) {
      console.error(`[Bulk upload error on file ${file.originalname}]:`, uploadError.message);
      throw uploadError;
    }

    try {
      const record = await MedicalRecord.create({
        patient: patient._id,
        appointment: appointmentId || undefined,
        uploaded_by: uploadedBy || undefined,
        title: recordTitle,
        description,
        file_url: s3Result.url || s3Result.canonicalUrl,
        file_path: `s3://${s3Result.bucket}/${s3Result.key}`,
        file_type: file.mimetype,
        storage_type: 's3',
        s3_key: s3Result.key,
        s3_bucket: s3Result.bucket,
        original_filename: file.originalname,
        file_size: s3Result.size,
        record_date: recordDate || new Date(),
        notes,
      });

      const withPresigned = await attachPresignedUrl(record);
      createdRecords.push(withPresigned);
    } catch (dbError) {
      console.error(`[DB insert failed for bulk file ${file.originalname}]:`, dbError.message);
      await s3Service.deletePatientFile(s3Result.key).catch(() => {});
      throw dbError;
    }
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
  return await attachPresignedUrl(record);
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

  const populatedRecords = await Promise.all(records.map(attachPresignedUrl));

  return {
    data: populatedRecords,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

exports.deleteRecord = async (id) => {
  const record = await MedicalRecord.findById(id);
  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete from S3 if stored there
  if (record.s3_key) {
    await s3Service.deletePatientFile(record.s3_key).catch((err) => {
      console.warn('Failed to delete S3 file on record delete:', err.message);
    });
  }

  await MedicalRecord.findByIdAndDelete(id);
  return record;
};

/**
 * Access-controlled file stream retrieval for authenticated downloads.
 * Verifies that the requesting user is either an admin or the owner of the patient profile.
 */
exports.getRecordFileStream = async (recordId, currentUser) => {
  const record = await MedicalRecord.findById(recordId).populate('patient');
  if (!record) {
    const error = new Error('Medical record not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isOwner =
    currentUser &&
    record.patient &&
    record.patient.user &&
    record.patient.user.toString() === currentUser._id.toString();
  const isUploader =
    currentUser && record.uploaded_by && record.uploaded_by.toString() === currentUser._id.toString();

  if (!isAdmin && !isOwner && !isUploader) {
    const error = new Error('You do not have permission to access this medical record');
    error.statusCode = 403;
    throw error;
  }

  const filename = record.original_filename || record.title || 'medical-record';

  if (record.storage_type === 's3' && record.s3_key) {
    const s3StreamResult = await s3Service.getFileStream(record.s3_key);
    return {
      type: 's3',
      stream: s3StreamResult.stream,
      contentType: s3StreamResult.contentType || record.file_type || 'application/octet-stream',
      contentLength: s3StreamResult.contentLength,
      filename,
    };
  }

  if (record.file_path) {
    return {
      type: 's3',
      filePath: record.file_path,
      contentType: record.file_type || 'application/octet-stream',
      filename,
    };
  }

  const error = new Error('File content is not available');
  error.statusCode = 404;
  throw error;
};
