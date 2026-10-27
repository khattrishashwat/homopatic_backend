const Patient = require('../../models/Patient');
const Counter = require('../../models/Counter');
const Appointment = require('../../models/Appointment');
const Prescription = require('../../models/Prescription');
const MedicalRecord = require('../../models/MedicalRecord');
const Payment = require('../../models/Payment');
const { v4: uuidv4 } = require('uuid');

exports.generatePatientId = async (clinicCode = '01') => {
  const formattedClinicCode = String(clinicCode || '01').padStart(2, '0');
  const counterKey = `patient_clinic_${formattedClinicCode}`;

  // Fetch all existing patients for this clinic to determine the true current highest sequence
  const existingPatients = await Patient.find({
    clinic_code: formattedClinicCode,
  }).select('patientId');

  let maxSeq = 100;
  if (existingPatients && existingPatients.length > 0) {
    for (const p of existingPatients) {
      const match = p.patientId?.match(new RegExp(`^MD'sH?/(\\d+)/${formattedClinicCode}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $set: { seq: nextSeq, updated_at: new Date() } },
    { upsert: true, new: true }
  );

  return `MD'sH/${counter.seq}/${formattedClinicCode}`;
};

exports.createPatient = async (data) => {
  const clinicCode = data.clinicCode || data.clinic_code || '01';
  let patientId = data.patientId;
  if (!patientId) {
    patientId = await exports.generatePatientId(clinicCode);
  }

  // Ensure unique patientId only if existing
  const existingWithId = await Patient.findOne({ patientId });
  if (existingWithId) {
    patientId = await exports.generatePatientId(clinicCode);
  }

  // Parse age if provided
  let ageVal = undefined;
  if (data.age !== undefined && data.age !== null && String(data.age).trim() !== '') {
    const num = Number(data.age);
    if (!isNaN(num)) ageVal = num;
  }

  // Parse Date of Admission
  let admissionDateVal = undefined;
  const admissionRaw = data.date_of_admission || data.admission_date || data.dateOfAdmission || data['Date of Admission'];
  if (admissionRaw) {
    const d = new Date(admissionRaw);
    if (!isNaN(d.getTime())) admissionDateVal = d;
  }

  // Normalize Gender: M or F or empty
  let genderVal = '';
  if (data.gender) {
    const g = String(data.gender).trim().toUpperCase();
    if (g === 'M' || g === 'MALE') genderVal = 'M';
    else if (g === 'F' || g === 'FEMALE') genderVal = 'F';
    else genderVal = g;
  }

  // Normalize address
  let addressObj = {};
  if (typeof data.address === 'object' && data.address !== null) {
    addressObj = {
      street: data.address.street || '',
      city: data.address.city || '',
      state: data.address.state || '',
      postal_code: data.address.postal_code || data.address.pincode || '',
      country: data.address.country || 'India',
    };
  } else if (typeof data.address === 'string') {
    addressObj = {
      street: data.address,
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
    };
  }

  return Patient.create({
    patientId,
    clinic_code: String(clinicCode).padStart(2, '0'),
    user: data.userId,
    name: data.name !== undefined && data.name !== null ? String(data.name).trim() : '',
    email: data.email !== undefined && data.email !== null ? String(data.email).trim() : '',
    phone: data.phone !== undefined && data.phone !== null ? String(data.phone).trim() : '',
    age: ageVal,
    date_of_admission: admissionDateVal,
    gender: genderVal,
    dob: data.dob ? new Date(data.dob) : undefined,
    address: addressObj,
    emergency_contact: data.emergency_contact,
    family_group: data.family_group,
    relationship: data.relationship,
    medical_history: data.medical_history || [],
    notes: data.notes || '',
  });
};

exports.updatePatient = async (id, data) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: id }, { patientId: id }] } : { patientId: id };
  const patient = await Patient.findOne(query);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  // If patientId is being changed, ensure uniqueness
  if (data.patientId && String(data.patientId).trim() !== patient.patientId) {
    const trimmedId = String(data.patientId).trim();
    const existing = await Patient.findOne({ patientId: trimmedId, _id: { $ne: patient._id } });
    if (existing) {
      const error = new Error(`Patient ID "${trimmedId}" is already taken by another patient.`);
      error.statusCode = 400;
      throw error;
    }
    patient.patientId = trimmedId;
  }

  // Name
  if (data.name !== undefined) {
    patient.name = String(data.name || '').trim();
  }

  // Email
  if (data.email !== undefined) {
    patient.email = String(data.email || '').trim();
  }

  // Phone
  if (data.phone !== undefined) {
    patient.phone = String(data.phone || '').trim();
  }

  // Gender
  if (data.gender !== undefined) {
    const g = String(data.gender || '').trim().toUpperCase();
    if (g === 'M' || g === 'MALE') patient.gender = 'M';
    else if (g === 'F' || g === 'FEMALE') patient.gender = 'F';
    else patient.gender = String(data.gender || '').trim();
  }

  // Age
  if (data.age !== undefined) {
    if (data.age === '' || data.age === null) {
      patient.age = undefined;
    } else {
      const num = Number(data.age);
      if (!isNaN(num)) patient.age = num;
    }
  }

  // Date of Admission
  if (data.date_of_admission !== undefined || data.admission_date !== undefined || data.dateOfAdmission !== undefined) {
    const val = data.date_of_admission ?? data.admission_date ?? data.dateOfAdmission;
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) patient.date_of_admission = d;
    } else {
      patient.date_of_admission = undefined;
    }
  }

  // Date of Birth (DOB)
  if (data.dob !== undefined) {
    if (data.dob) {
      const d = new Date(data.dob);
      if (!isNaN(d.getTime())) patient.dob = d;
    } else {
      patient.dob = undefined;
    }
  }

  // Clinic Code
  if (data.clinic_code !== undefined || data.clinicCode !== undefined) {
    const code = data.clinic_code ?? data.clinicCode;
    if (code) patient.clinic_code = String(code).padStart(2, '0');
  }

  // Address
  if (data.address !== undefined) {
    if (typeof data.address === 'object' && data.address !== null) {
      patient.address = {
        street: data.address.street !== undefined ? String(data.address.street).trim() : (patient.address?.street || ''),
        city: data.address.city !== undefined ? String(data.address.city).trim() : (patient.address?.city || ''),
        state: data.address.state !== undefined ? String(data.address.state).trim() : (patient.address?.state || ''),
        postal_code: data.address.postal_code !== undefined ? String(data.address.postal_code).trim() : (patient.address?.postal_code || ''),
        country: data.address.country !== undefined ? String(data.address.country).trim() : (patient.address?.country || 'India'),
      };
    } else if (typeof data.address === 'string') {
      patient.address = {
        street: String(data.address).trim(),
        city: patient.address?.city || '',
        state: patient.address?.state || '',
        postal_code: patient.address?.postal_code || '',
        country: patient.address?.country || 'India',
      };
    }
  }

  // Emergency Contact
  if (data.emergency_contact !== undefined) {
    if (typeof data.emergency_contact === 'object' && data.emergency_contact !== null) {
      patient.emergency_contact = {
        name: data.emergency_contact.name !== undefined ? String(data.emergency_contact.name).trim() : (patient.emergency_contact?.name || ''),
        phone: data.emergency_contact.phone !== undefined ? String(data.emergency_contact.phone).trim() : (patient.emergency_contact?.phone || ''),
        relationship: data.emergency_contact.relationship !== undefined ? String(data.emergency_contact.relationship).trim() : (patient.emergency_contact?.relationship || ''),
      };
    }
  }

  // Family Group & Relationship
  if (data.family_group !== undefined) {
    patient.family_group = data.family_group ? String(data.family_group).trim() : undefined;
  }
  if (data.relationship !== undefined) {
    patient.relationship = data.relationship ? String(data.relationship).trim() : undefined;
  }

  // Medical History
  if (data.medical_history !== undefined) {
    if (Array.isArray(data.medical_history)) {
      patient.medical_history = data.medical_history.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof data.medical_history === 'string') {
      patient.medical_history = data.medical_history.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  // Notes
  if (data.notes !== undefined) {
    patient.notes = String(data.notes || '').trim();
  }

  // Active status
  if (data.active !== undefined) {
    patient.active = Boolean(data.active);
  }

  patient.updated_at = new Date();
  await patient.save();
  return patient.populate('family_members');
};

exports.deletePatient = async (id) => {
  const query = id.match(/^[0-9a-fA-F]{24}$/) ? { $or: [{ _id: id }, { patientId: id }] } : { patientId: id };
  const patient = await Patient.findOne(query);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  // 1. Remove from family members list of other patients
  await Patient.updateMany(
    { family_members: patient._id },
    { $pull: { family_members: patient._id } }
  );

  // 2. Cascade delete related records
  await Appointment.deleteMany({ patient: patient._id });
  await Prescription.deleteMany({ patient: patient._id });
  await MedicalRecord.deleteMany({ patient: patient._id });
  await Payment.deleteMany({ patient: patient._id });

  // 3. Hard delete: Permanently remove patient from database
  await Patient.deleteOne({ _id: patient._id });

  // 4. Auto-sync or reset counter for this clinic
  const clinicCode = patient.clinic_code || '01';
  const formattedClinicCode = String(clinicCode).padStart(2, '0');
  const counterKey = `patient_clinic_${formattedClinicCode}`;
  const remainingPatients = await Patient.find({ clinic_code: formattedClinicCode }).select('patientId');

  if (!remainingPatients || remainingPatients.length === 0) {
    // If no patients left in DB for this clinic, delete counter so next starts at 101
    await Counter.deleteOne({ key: counterKey });
  } else {
    // Sync counter to the current highest patient sequence number
    let maxSeq = 100;
    for (const p of remainingPatients) {
      const match = p.patientId?.match(new RegExp(`^MD'sH?/(\\d+)/${formattedClinicCode}$`));
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxSeq) {
          maxSeq = num;
        }
      }
    }
    await Counter.findOneAndUpdate(
      { key: counterKey },
      { $set: { seq: maxSeq, updated_at: new Date() } }
    );
  }

  return { message: 'Patient permanently deleted', patientId: patient.patientId, _id: patient._id };
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
  const query = { active: { $ne: false } };

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

exports.createFamily = async (data) => {
  const { familyName, head, members = [], sharedAddress = true, userId } = data;
  if (!head || !head.name || !head.email || !head.phone) {
    const error = new Error('Family Head details (name, email, phone) are required');
    error.statusCode = 400;
    throw error;
  }

  const familyGroup = familyName || `FAM-${uuidv4().split('-')[0].toUpperCase()}`;

  // Phone numbers, emails, and addresses can be shared/duplicate across patients

  const clinicCode = data.clinicCode || data.clinic_code || '01';
  const headPatientId = head.patientId || (await exports.generatePatientId(clinicCode));
  const headDoc = await Patient.create({
    patientId: headPatientId,
    clinic_code: String(clinicCode).padStart(2, '0'),
    user: userId,
    name: head.name,
    email: head.email,
    phone: head.phone,
    gender: head.gender,
    dob: head.dob ? new Date(head.dob) : undefined,
    address: head.address,
    emergency_contact: head.emergency_contact || { name: head.name, phone: head.phone, relationship: 'Self' },
    family_group: familyGroup,
    relationship: 'Head',
    medical_history: head.medical_history || [],
    notes: head.notes,
  });

  const createdMembers = [];
  const allCreatedIds = [headDoc._id];

  for (const m of members) {
    if (!m.name || !m.phone) continue;
    const memberPatientId = m.patientId || (await exports.generatePatientId(clinicCode));
    const memberDoc = await Patient.create({
      patientId: memberPatientId,
      clinic_code: String(clinicCode).padStart(2, '0'),
      user: userId,
      name: m.name,
      email: m.email || `${memberPatientId.toLowerCase()}@clinic.local`,
      phone: m.phone || head.phone,
      gender: m.gender,
      dob: m.dob ? new Date(m.dob) : undefined,
      address: sharedAddress ? head.address : (m.address || head.address),
      emergency_contact: m.emergency_contact || { name: head.name, phone: head.phone, relationship: 'Head' },
      family_group: familyGroup,
      relationship: m.relationship || 'Member',
      medical_history: m.medical_history || [],
      notes: m.notes,
    });
    createdMembers.push(memberDoc);
    allCreatedIds.push(memberDoc._id);
  }

  for (const doc of [headDoc, ...createdMembers]) {
    doc.family_members = allCreatedIds.filter((id) => !id.equals(doc._id));
    await doc.save();
  }

  return {
    family_group: familyGroup,
    head: headDoc,
    members: createdMembers,
    total: allCreatedIds.length,
  };
};

exports.bulkImport = async (patients, userId) => {
  if (!Array.isArray(patients) || patients.length === 0) {
    const error = new Error('No patient records provided for import');
    error.statusCode = 400;
    throw error;
  }

  const results = {
    total: patients.length,
    successful: 0,
    failed: 0,
    errors: [],
    created: [],
  };

  for (let i = 0; i < patients.length; i++) {
    const row = patients[i];
    const rowNum = i + 1;

    try {
      const clinicCode = row.clinicCode || row.clinic_code || '01';
      let patientId = row.patientId || (await exports.generatePatientId(clinicCode));

      // Ensure unique patientId only if existing
      const existingWithId = await Patient.findOne({ patientId });
      if (existingWithId) {
        patientId = await exports.generatePatientId(clinicCode);
      }

      // Parse age
      let ageVal = undefined;
      if (row.age !== undefined && row.age !== null && String(row.age).trim() !== '') {
        const num = Number(row.age);
        if (!isNaN(num)) ageVal = num;
      }

      // Parse Date of Admission
      let admissionDateVal = undefined;
      const admissionRaw = row.date_of_admission || row['Date of Admission'] || row.dateOfAdmission || row.admission_date;
      if (admissionRaw) {
        const d = new Date(admissionRaw);
        if (!isNaN(d.getTime())) admissionDateVal = d;
      }

      // Gender: M or F
      let genderVal = '';
      if (row.gender) {
        const g = String(row.gender).trim().toUpperCase();
        if (g === 'M' || g === 'MALE') genderVal = 'M';
        else if (g === 'F' || g === 'FEMALE') genderVal = 'F';
      }

      // Address mapping
      const addressObj = typeof row.address === 'object' && row.address !== null
        ? {
            street: row.address.street !== undefined ? row.address.street : (row.address || ''),
            city: row.address.city || row.city || '',
            state: row.address.state || '',
            postal_code: row.address.postal_code || row.postal_code || '',
            country: 'India',
          }
        : {
            street: row.address !== undefined && row.address !== null ? String(row.address).trim() : '',
            city: row.city !== undefined && row.city !== null ? String(row.city).trim() : '',
            state: '',
            postal_code: row.postal_code !== undefined && row.postal_code !== null ? String(row.postal_code).trim() : '',
            country: 'India',
          };

      const created = await Patient.create({
        patientId,
        clinic_code: String(clinicCode).padStart(2, '0'),
        user: userId,
        name: row.name !== undefined && row.name !== null ? String(row.name).trim() : '',
        email: row.email !== undefined && row.email !== null ? String(row.email).trim() : '',
        phone: row.phone !== undefined && row.phone !== null ? String(row.phone).trim() : '',
        age: ageVal,
        date_of_admission: admissionDateVal,
        gender: genderVal,
        address: addressObj,
        family_group: row.family_group ? String(row.family_group).trim() : undefined,
        relationship: row.relationship ? String(row.relationship).trim() : undefined,
        notes: row.notes !== undefined && row.notes !== null ? String(row.notes).trim() : '',
      });

      results.successful++;
      results.created.push(created);
    } catch (err) {
      results.failed++;
      results.errors.push({ row: rowNum, name: row.name || `Row ${rowNum}`, reason: err.message });
    }
  }

  const familyMap = {};
  for (const pat of results.created) {
    if (pat.family_group) {
      if (!familyMap[pat.family_group]) familyMap[pat.family_group] = [];
      familyMap[pat.family_group].push(pat);
    }
  }

  for (const group of Object.keys(familyMap)) {
    const groupPatients = familyMap[group];
    if (groupPatients.length > 1) {
      const allIds = groupPatients.map((p) => p._id);
      for (const p of groupPatients) {
        p.family_members = allIds.filter((id) => !id.equals(p._id));
        await p.save();
      }
    }
  }

  return results;
};
