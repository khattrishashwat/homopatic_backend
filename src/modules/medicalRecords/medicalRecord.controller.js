const medicalRecordService = require('./medicalRecord.service');
const validation = require('./medicalRecord.validation');

exports.uploadRecord = async (req, res, next) => {
  try {
    validation.validateUploadRecord(req.body, req.file);
    const record = await medicalRecordService.uploadRecord({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      uploadedBy: req.user?._id,
      file: req.file,
      title: req.body.title,
      description: req.body.description,
      notes: req.body.notes,
      recordDate: req.body.record_date,
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

exports.uploadBulkRecords = async (req, res, next) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    validation.validateUploadBulkRecords(req.body, files);
    const records = await medicalRecordService.uploadBulkRecords({
      patientId: req.body.patientId,
      appointmentId: req.body.appointmentId,
      uploadedBy: req.user?._id,
      files,
      title: req.body.title,
      description: req.body.description,
      notes: req.body.notes,
      recordDate: req.body.record_date,
    });
    res.status(201).json({
      success: true,
      message: `${records.length} medical record(s) uploaded successfully`,
      count: records.length,
      data: records,
    });
  } catch (error) {
    next(error);
  }
};

exports.getRecordById = async (req, res, next) => {
  try {
    const record = await medicalRecordService.getRecordById(req.params.id);
    res.json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
};

exports.listRecords = async (req, res, next) => {
  try {
    const result = await medicalRecordService.listRecords(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    await medicalRecordService.deleteRecord(req.params.id);
    res.json({ success: true, message: 'Medical record deleted successfully' });
  } catch (error) {
    next(error);
  }
};
