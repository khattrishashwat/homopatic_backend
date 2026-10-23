const Prescription = require('../../models/Prescription');
const Patient = require('../../models/Patient');
const Appointment = require('../../models/Appointment');
const Counter = require('../../models/Counter');
const SiteSettings = require('../../models/SiteSettings');
const { generatePrescriptionPdf } = require('../../utils/pdfGenerator');
const s3Service = require('../../services/s3Service');

/**
 * Resolves fresh short-lived presigned download URLs for prescriptions stored in S3,
 * ensuring all images and PDFs point directly to S3.
 */
async function attachPresignedUrls(prescription) {
  if (!prescription) return prescription;
  const doc = prescription.toObject ? prescription.toObject() : { ...prescription };
  const bucket = doc.image_s3_bucket || doc.pdf_s3_bucket || process.env.AWS_S3_BUCKET || 'mdshomoeopathy-patient-files-2026';
  const region = s3Service.AWS_REGION || 'ap-south-1';

  if (doc.image_s3_key) {
    try {
      doc.image_url = await s3Service.getPresignedDownloadUrl(doc.image_s3_key, {
        expiresIn: 86400, // 24 hours
      });
    } catch (err) {
      console.warn(`[Prescription S3 Image URL Error for ${doc._id}]:`, err.message);
      doc.image_url = `https://${bucket}.s3.${region}.amazonaws.com/${doc.image_s3_key.replace(/^\/+/, '')}`;
    }
  } else if (doc.image_url && !doc.image_url.startsWith('http')) {
    const key = doc.image_url.replace(/^\/+uploads\/prescriptions\//, 'prescriptions/').replace(/^\/+/, '');
    doc.image_url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }

  if (doc.pdf_s3_key) {
    try {
      doc.pdf_url = await s3Service.getPresignedDownloadUrl(doc.pdf_s3_key, {
        expiresIn: 86400, // 24 hours
        downloadFilename: `${doc.prescriptionNumber || 'prescription'}.pdf`,
      });
    } catch (err) {
      console.warn(`[Prescription S3 PDF URL Error for ${doc._id}]:`, err.message);
      doc.pdf_url = `/api/admin/prescriptions/${doc._id}/pdf`;
    }
  } else if (doc.pdf_url && !doc.pdf_url.startsWith('http')) {
    doc.pdf_url = `/api/admin/prescriptions/${doc._id}/pdf`;
  }

  return doc;
}

exports.generatePrescriptionNumber = async () => {
  const counterKey = 'prescription_number';

  let counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 }, $set: { updated_at: new Date() } },
    { new: true }
  );

  if (!counter) {
    let startingSeq = 1000;
    try {
      const existing = await Prescription.find({
        prescriptionNumber: /^MDH-RX-(\d+)$/,
      }).select('prescriptionNumber');

      if (existing && existing.length > 0) {
        for (const p of existing) {
          const match = p.prescriptionNumber.match(/^MDH-RX-(\d+)$/);
          if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > startingSeq) {
              startingSeq = num;
            }
          }
        }
      }
    } catch (e) {
      // fallback
    }

    try {
      counter = await Counter.create({
        key: counterKey,
        seq: startingSeq + 1,
        updated_at: new Date(),
      });
    } catch (err) {
      if (err.code === 11000) {
        counter = await Counter.findOneAndUpdate(
          { key: counterKey },
          { $inc: { seq: 1 }, $set: { updated_at: new Date() } },
          { new: true }
        );
      } else {
        throw err;
      }
    }
  }

  return `MDH-RX-${counter.seq}`;
};

exports.createPrescription = async (data) => {
  const patientQuery = data.patientId?.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: data.patientId }, { patientId: data.patientId }] }
    : { patientId: data.patientId };
  const patient = await Patient.findOne(patientQuery);
  if (!patient) {
    const error = new Error('Patient not found with the provided ID');
    error.statusCode = 404;
    throw error;
  }

  // Calculate age
  let calculatedAge = undefined;
  if (patient.dob) {
    const diffMs = Date.now() - new Date(patient.dob).getTime();
    calculatedAge = Math.floor(diffMs / (365.25 * 24 * 60 * 60 * 1000));
  }

  const prescriptionNumber = await exports.generatePrescriptionNumber();

  // Get site settings if available for fallback/custom branding
  const settings = await SiteSettings.findOne().lean().catch(() => null);

  const doctor_info = {
    name: data.doctorName || 'Dr. Parth Bhargava',
    qualification: data.doctorQualification || 'BHMS, Homoeopathic Physician',
    specialization: data.doctorSpecialization || 'Allergy, Nasal Polyp, Renal Calculi, Migraine, etc.',
    reg_no: data.doctorRegNo || 'H043267',
    phone: data.doctorPhone || settings?.phone || '+91 7668610031',
  };

  const clinic_info = {
    name: settings?.site_name || 'MD’s HOMOEOPATHY',
    tagline: 'A Destination for A Permanent Cure And Perfect Care',
    address: settings?.address || 'Deeg Gali Kachchi Sadak, Lal Darwaza, Mathura',
    phone: settings?.phone || '+91 7668610031',
    email: settings?.email || 'contact@mdshomoeopathy.com',
    website: settings?.site_url || 'www.mdshomoeopathy.com',
  };

  const patient_snapshot = {
    name: patient.name,
    patientId: patient.patientId,
    gender: patient.gender || '-',
    age: calculatedAge,
    phone: patient.phone,
  };

  let imageUrl = data.imageUrl || data.image_url || undefined;
  let imageS3Key = data.image_s3_key || data.imageS3Key || undefined;
  let imageS3Bucket = data.image_s3_bucket || data.imageS3Bucket || (imageS3Key ? process.env.AWS_S3_BUCKET : undefined);

  if (data.imageData) {
    try {
      const safeId = String(patient.patientId || patient._id).replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${Date.now()}-pad-${safeId}.jpg`;
      const base64Data = data.imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Upload directly to S3 — NEVER save to local disk
      const s3Img = await s3Service.uploadPatientFile({
        buffer: imageBuffer,
        patientId: patient.patientId || patient._id,
        category: 'prescriptions',
        originalname: filename,
        mimetype: 'image/jpeg',
        metadata: {
          prescriptionNumber,
          type: 'prescription-canvas-image',
        },
      });
      imageS3Key = s3Img.key;
      imageS3Bucket = s3Img.bucket;
      imageUrl = s3Img.url || s3Img.canonicalUrl;
    } catch (imgErr) {
      console.error('[Prescription S3 image upload error]:', imgErr.message);
      throw new Error(`Failed to upload prescription image to AWS S3: ${imgErr.message}`);
    }
  }

  if (imageS3Key && !imageUrl) {
    imageUrl = s3Service.getCanonicalUrl(imageS3Key);
  }

  const prescription = await Prescription.create({
    prescriptionNumber,
    patient: patient._id,
    appointment: data.appointmentId || undefined,
    doctor: data.doctorId || undefined,
    title: data.title || 'Prescription',
    prescription_date: data.prescriptionDate ? new Date(data.prescriptionDate) : new Date(),
    doctor_info,
    clinic_info,
    patient_snapshot,
    vitals: data.vitals || {},
    medicines: data.medicines || [],
    advice: data.advice || {},
    notes: data.notes || '',
    image_url: imageUrl,
    image_s3_key: imageS3Key,
    image_s3_bucket: imageS3Bucket,
    storage_type: 's3',
  });

  try {
    const pdfData = await generatePrescriptionPdf({
      ...prescription.toObject(),
      patient,
    });

    // Upload generated PDF directly to S3 — NEVER save to local disk
    if (pdfData && pdfData.buffer) {
      const s3Pdf = await s3Service.uploadPatientFile({
        buffer: pdfData.buffer,
        patientId: patient.patientId || patient._id,
        category: 'prescriptions',
        originalname: `${prescriptionNumber}.pdf`,
        mimetype: 'application/pdf',
        metadata: {
          prescriptionNumber,
          patientId: String(patient.patientId || patient._id),
        },
      });
      prescription.pdf_s3_key = s3Pdf.key;
      prescription.pdf_s3_bucket = s3Pdf.bucket;
      prescription.pdf_url = s3Pdf.url || s3Pdf.canonicalUrl;
      prescription.storage_type = 's3';
      await prescription.save();
    }
  } catch (pdfErr) {
    console.error('[Prescription PDF S3 upload error]:', pdfErr.message);
  }

  return await attachPresignedUrls(prescription);
};

exports.getPrescriptionById = async (id) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: id }, { prescriptionNumber: id }] }
    : { prescriptionNumber: id };

  const prescription = await Prescription.findOne(query).populate('patient doctor appointment');
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }
  return await attachPresignedUrls(prescription);
};

exports.updatePrescription = async (id, data) => {
  const prescription = await Prescription.findById(id);
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.vitals) prescription.vitals = { ...prescription.vitals, ...data.vitals };
  if (data.medicines) prescription.medicines = data.medicines;
  if (data.advice) prescription.advice = { ...prescription.advice, ...data.advice };
  if (data.notes !== undefined) prescription.notes = data.notes;
  if (data.title) prescription.title = data.title;
  if (data.status) prescription.status = data.status;
  prescription.updated_at = new Date();

  await prescription.save();

  // Regenerate PDF and upload to S3 — NEVER save to local disk
  try {
    const patient = await Patient.findById(prescription.patient);
    const pdfData = await generatePrescriptionPdf({
      ...prescription.toObject(),
      patient,
    });

    if (pdfData && pdfData.buffer) {
      const s3Pdf = await s3Service.uploadPatientFile({
        buffer: pdfData.buffer,
        patientId: patient?.patientId || patient?._id || prescription.patient,
        category: 'prescriptions',
        originalname: `${prescription.prescriptionNumber}.pdf`,
        mimetype: 'application/pdf',
        metadata: {
          prescriptionNumber: prescription.prescriptionNumber,
          updatedAt: new Date().toISOString(),
        },
      });
      prescription.pdf_s3_key = s3Pdf.key;
      prescription.pdf_s3_bucket = s3Pdf.bucket;
      prescription.pdf_url = s3Pdf.url || s3Pdf.canonicalUrl;
      prescription.storage_type = 's3';
      await prescription.save();
    }
  } catch (pdfErr) {
    console.error('[updatePrescription pdf regeneration error]:', pdfErr.message);
  }

  return await attachPresignedUrls(prescription);
};

exports.deletePrescription = async (id) => {
  const prescription = await Prescription.findById(id);
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete from S3
  if (prescription.pdf_s3_key) {
    await s3Service.deletePatientFile(prescription.pdf_s3_key).catch(() => {});
  }
  if (prescription.image_s3_key) {
    await s3Service.deletePatientFile(prescription.image_s3_key).catch(() => {});
  }

  await Prescription.findByIdAndDelete(id);
  return prescription;
};

exports.listPrescriptions = async (filters = {}) => {
  const query = {};

  if (filters.patientId) {
    const patientQuery = filters.patientId.match(/^[0-9a-fA-F]{24}$/)
      ? { $or: [{ _id: filters.patientId }, { patientId: filters.patientId }] }
      : { patientId: filters.patientId };
    const p = await Patient.findOne(patientQuery).select('_id');
    if (p) {
      query.patient = p._id;
    } else {
      query.patient = filters.patientId;
    }
  }

  if (filters.doctorId) {
    query.doctor = filters.doctorId;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.search) {
    const term = filters.search.trim();
    const matchingPatients = await Patient.find({
      $or: [
        { name: { $regex: term, $options: 'i' } },
        { patientId: { $regex: term, $options: 'i' } },
        { phone: { $regex: term, $options: 'i' } },
      ],
    }).select('_id');

    const patientIds = matchingPatients.map((p) => p._id);

    query.$or = [
      { prescriptionNumber: { $regex: term, $options: 'i' } },
      { 'patient_snapshot.name': { $regex: term, $options: 'i' } },
      { 'patient_snapshot.patientId': { $regex: term, $options: 'i' } },
      { patient: { $in: patientIds } },
    ];
  }

  if (filters.startDate || filters.endDate) {
    query.prescription_date = {};
    if (filters.startDate) query.prescription_date.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.prescription_date.$lte = end;
    }
  }

  const page = parseInt(filters.page, 10) || 1;
  const limit = parseInt(filters.limit, 10) || 50;
  const skip = (page - 1) * limit;

  const prescriptions = await Prescription.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('patient doctor appointment');

  const total = await Prescription.countDocuments(query);

  const populatedPrescriptions = await Promise.all(prescriptions.map(attachPresignedUrls));

  return {
    data: populatedPrescriptions,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};

/**
 * Access-controlled prescription PDF retrieval.
 * Supports streaming from S3 or sending local PDF with permission validation.
 */
exports.getPrescriptionPdfStream = async (id, currentUser) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: id }, { prescriptionNumber: id }] }
    : { prescriptionNumber: id };

  const prescription = await Prescription.findOne(query).populate('patient doctor');
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isDoctor =
    currentUser &&
    prescription.doctor &&
    prescription.doctor._id.toString() === currentUser._id.toString();
  const isOwner =
    currentUser &&
    prescription.patient &&
    prescription.patient.user &&
    prescription.patient.user.toString() === currentUser._id.toString();

  if (!isAdmin && !isDoctor && !isOwner) {
    const error = new Error('You do not have permission to access this prescription');
    error.statusCode = 403;
    throw error;
  }

  const filename = `${prescription.prescriptionNumber || 'prescription'}.pdf`;

  if (prescription.pdf_s3_key) {
    const s3Result = await s3Service.getFileStream(prescription.pdf_s3_key);
    return {
      type: 's3',
      stream: s3Result.stream,
      contentType: 'application/pdf',
      contentLength: s3Result.contentLength,
      filename,
    };
  }

  const error = new Error('Prescription PDF is not available');
  error.statusCode = 404;
  throw error;
};

/**
 * Access-controlled prescription image stream directly from S3.
 */
exports.getPrescriptionImageStream = async (id, currentUser) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/)
    ? { $or: [{ _id: id }, { prescriptionNumber: id }] }
    : { prescriptionNumber: id };

  const prescription = await Prescription.findOne(query).populate('patient doctor');
  if (!prescription) {
    const error = new Error('Prescription not found');
    error.statusCode = 404;
    throw error;
  }

  // Authorization check
  const isAdmin = currentUser && currentUser.role === 'admin';
  const isDoctor =
    currentUser &&
    prescription.doctor &&
    prescription.doctor._id.toString() === currentUser._id.toString();
  const isOwner =
    currentUser &&
    prescription.patient &&
    prescription.patient.user &&
    prescription.patient.user.toString() === currentUser._id.toString();

  if (!isAdmin && !isDoctor && !isOwner) {
    const error = new Error('You do not have permission to access this prescription');
    error.statusCode = 403;
    throw error;
  }

  const filename = `${prescription.prescriptionNumber || 'prescription'}.jpg`;

  if (prescription.image_s3_key) {
    const s3Result = await s3Service.getFileStream(prescription.image_s3_key);
    return {
      type: 's3',
      stream: s3Result.stream,
      contentType: s3Result.contentType || 'image/jpeg',
      contentLength: s3Result.contentLength,
      filename,
      url: prescription.image_url,
    };
  }

  const error = new Error('Prescription image is not available');
  error.statusCode = 404;
  throw error;
};
