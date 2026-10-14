const fsPromises = require('fs').promises;
const path = require('path');
const Prescription = require('../../models/Prescription');
const Patient = require('../../models/Patient');
const Appointment = require('../../models/Appointment');
const Counter = require('../../models/Counter');
const SiteSettings = require('../../models/SiteSettings');
const { generatePrescriptionPdf } = require('../../utils/pdfGenerator');

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

  let imageUrl = undefined;
  let imagePath = undefined;
  if (data.imageData) {
    try {
      const folder = 'prescriptions';
      const uploadPath = path.join(__dirname, '..', '..', 'uploads', folder);
      await fsPromises.mkdir(uploadPath, { recursive: true });
      const safeId = String(patient.patientId || patient._id).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${Date.now()}-pad-${safeId}.jpg`;
      const fullFilePath = path.join(uploadPath, filename);

      const base64Data = data.imageData.replace(/^data:image\/\w+;base64,/, '');
      await fsPromises.writeFile(fullFilePath, base64Data, 'base64');
      imageUrl = `/uploads/${folder}/${filename}`;
      imagePath = fullFilePath;
    } catch (imgErr) {
      console.error('[Save prescription image error]:', imgErr.message);
    }
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
    image_path: imagePath,
  });

  try {
    const pdfData = await generatePrescriptionPdf({
      ...prescription.toObject(),
      patient,
    });

    prescription.pdf_url = pdfData.pdfUrl;
    prescription.pdf_path = pdfData.pdfPath;
    await prescription.save();
  } catch (pdfErr) {
    console.error('[generatePrescriptionPdf error]:', pdfErr.message);
  }

  return prescription;
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
  return prescription;
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

  // Regenerate PDF
  try {
    const patient = await Patient.findById(prescription.patient);
    const pdfData = await generatePrescriptionPdf({
      ...prescription.toObject(),
      patient,
    });
    prescription.pdf_url = pdfData.pdfUrl;
    prescription.pdf_path = pdfData.pdfPath;
    await prescription.save();
  } catch (pdfErr) {
    console.error('[updatePrescription pdf regeneration error]:', pdfErr.message);
  }

  return prescription;
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
    // Search in prescriptionNumber or matching patient name/id
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

  return {
    data: prescriptions,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
};
