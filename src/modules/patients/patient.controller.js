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

const excelService = require('../../services/excelService');
const fs = require('fs');
const path = require('path');

exports.importExcel = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx/.xls) or CSV file' });
    }

    const result = await excelService.importPatientsFile({
      buffer: req.file.buffer,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      userId: req.user?._id,
    });

    res.status(200).json({
      success: true,
      message: `Processed ${result.total} records: ${result.successful} created, ${result.failed} rejected`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportExcel = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const result = await excelService.exportPatients({ query: req.query, format });

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }

    res.json({
      success: true,
      message: 'Patients exported successfully',
      data: {
        downloadUrl: result.downloadUrl,
        s3Key: result.key,
        filename: result.filename,
        count: result.count,
        storage: result.storage,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadSampleTemplate = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const sampleFilePath = path.resolve(__dirname, '..', '..', '..', 'public', `patient_sample_data_20.${format}`);

    if (fs.existsSync(sampleFilePath)) {
      return res.download(sampleFilePath, `patient_sample_template.${format}`);
    }

    const sampleRows = [
      {
        name: 'Rajesh Sharma',
        phone: '9811012345',
        email: 'rajesh.sharma@example.com',
        dob: '1978-04-12',
        gender: 'male',
        street: 'Flat 402, Shivalik Apartments, Rohini Sector 9',
        city: 'Delhi',
        state: 'Delhi',
        postal_code: '110085',
        family_group: 'FAM-SHARMA',
        relationship: 'Head',
        medical_history: 'Hypertension; Type 2 Diabetes',
        notes: 'Family Head; regular follow-up required',
      },
    ];

    const buf = format === 'csv' ? excelService.generateCsvBuffer(sampleRows) : excelService.generateExcelBuffer(sampleRows, { sheetName: 'Patients' });
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="patient_sample_template.${format}"`);
    return res.send(buf);
  } catch (error) {
    next(error);
  }
};
