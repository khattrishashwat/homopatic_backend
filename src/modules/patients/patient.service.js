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

  let counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 }, $set: { updated_at: new Date() } },
    { new: true }
  );

  if (!counter) {
    let startingSeq = 100;
    try {
      const existingPatients = await Patient.find({
        patientId: new RegExp(`^MD'sH/(\\d+)/${formattedClinicCode}$`),
      }).select('patientId');

      if (existingPatients && existingPatients.length > 0) {
        for (const p of existingPatients) {
          const match = p.patientId.match(new RegExp(`^MD'sH/(\\d+)/${formattedClinicCode}$`));
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

  return `MD'sH/${counter.seq}/${formattedClinicCode}`;
};

exports.createPatient = async (data) => {
  const clinicCode = data.clinicCode || data.clinic_code || '01';
  const patientId = data.patientId || (await exports.generatePatientId(clinicCode));

  const existing = await Patient.findOne({ $or: [{ email: data.email }, { phone: data.phone }, { patientId }] });
  if (existing) {
    const error = new Error('Patient with same email, phone, or patientId already exists');
    error.statusCode = 400;
    throw error;
  }

  return Patient.create({
    patientId,
    clinic_code: String(clinicCode).padStart(2, '0'),
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

exports.deletePatient = async (id) => {
  const patient = await Patient.findById(id);
  if (!patient) {
    const error = new Error('Patient not found');
    error.statusCode = 404;
    throw error;
  }

  patient.active = false;
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

exports.createFamily = async (data) => {
  const { familyName, head, members = [], sharedAddress = true, userId } = data;
  if (!head || !head.name || !head.email || !head.phone) {
    const error = new Error('Family Head details (name, email, phone) are required');
    error.statusCode = 400;
    throw error;
  }

  const familyGroup = familyName || `FAM-${uuidv4().split('-')[0].toUpperCase()}`;

  const allCandidates = [head, ...members];
  const emails = allCandidates.map((c) => c.email).filter(Boolean);
  const phones = allCandidates.map((c) => c.phone).filter(Boolean);

  const existing = await Patient.find({
    $or: [{ email: { $in: emails } }, { phone: { $in: phones } }],
  });

  if (existing.length > 0) {
    const conflict = existing.map((e) => `${e.name} (${e.email || e.phone})`).join(', ');
    const error = new Error(`Patient(s) already exist with given email/phone: ${conflict}`);
    error.statusCode = 400;
    throw error;
  }

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

  const seenInBatch = new Set();
  const validToInsert = [];

  for (let i = 0; i < patients.length; i++) {
    const row = patients[i];
    const rowNum = i + 1;

    if (!row.name || !String(row.name).trim()) {
      results.failed++;
      results.errors.push({ row: rowNum, name: row.name || 'Unknown', reason: 'Name is required' });
      continue;
    }

    if (!row.email || !String(row.email).trim()) {
      results.failed++;
      results.errors.push({ row: rowNum, name: row.name, reason: 'Email is required' });
      continue;
    }

    if (!row.phone || !String(row.phone).trim()) {
      results.failed++;
      results.errors.push({ row: rowNum, name: row.name, reason: 'Phone is required' });
      continue;
    }

    const emailKey = String(row.email).trim().toLowerCase();
    const phoneKey = String(row.phone).trim();

    if (seenInBatch.has(emailKey) || seenInBatch.has(phoneKey)) {
      results.failed++;
      results.errors.push({ row: rowNum, name: row.name, reason: 'Duplicate email or phone in the same upload file' });
      continue;
    }
    seenInBatch.add(emailKey);
    seenInBatch.add(phoneKey);

    validToInsert.push({ rowNum, data: row });
  }

  for (const item of validToInsert) {
    const { rowNum, data } = item;
    try {
      const existing = await Patient.findOne({
        $or: [{ email: String(data.email).trim() }, { phone: String(data.phone).trim() }],
      });

      if (existing) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: data.name,
          reason: `Patient with email/phone already exists in database (${existing.patientId})`,
        });
        continue;
      }

      const clinicCode = data.clinicCode || data.clinic_code || '01';
      const patientId = data.patientId || (await exports.generatePatientId(clinicCode));

      let dobVal = undefined;
      if (data.dob) {
        const d = new Date(data.dob);
        if (!isNaN(d.getTime())) dobVal = d;
      }

      let genderVal = 'other';
      if (data.gender && ['male', 'female', 'other'].includes(String(data.gender).toLowerCase())) {
        genderVal = String(data.gender).toLowerCase();
      }

      const addressObj = typeof data.address === 'object' && data.address !== null
        ? data.address
        : {
            street: data.street || (typeof data.address === 'string' ? data.address : ''),
            city: data.city || '',
            state: data.state || '',
            postal_code: data.postal_code || data.pincode || '',
            country: data.country || 'India',
          };

      let historyArr = [];
      if (Array.isArray(data.medical_history)) {
        historyArr = data.medical_history;
      } else if (typeof data.medical_history === 'string' && data.medical_history.trim()) {
        historyArr = data.medical_history.split(/[;,|]/).map((s) => s.trim()).filter(Boolean);
      }

      const created = await Patient.create({
        patientId,
        clinic_code: String(clinicCode).padStart(2, '0'),
        user: userId,
        name: String(data.name).trim(),
        email: String(data.email).trim(),
        phone: String(data.phone).trim(),
        gender: genderVal,
        dob: dobVal,
        address: addressObj,
        emergency_contact: {
          name: data.emergency_name || data.emergency_contact?.name || '',
          phone: data.emergency_phone || data.emergency_contact?.phone || '',
          relationship: data.relationship || data.emergency_contact?.relationship || '',
        },
        family_group: data.family_group || undefined,
        relationship: data.relationship || undefined,
        medical_history: historyArr,
        notes: data.notes || '',
      });

      results.successful++;
      results.created.push(created);
    } catch (err) {
      results.failed++;
      results.errors.push({ row: rowNum, name: data.name, reason: err.message });
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
