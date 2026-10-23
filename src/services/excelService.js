const xlsx = require('xlsx');
const path = require('path');
const s3Service = require('./s3Service');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const Order = require('../models/Order');
const Product = require('../models/Product');
const patientService = require('../modules/patients/patient.service');

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_XLS = 'application/vnd.ms-excel';
const MIME_CSV = 'text/csv';

/**
 * Parses an Excel or CSV buffer into an array of normalized JSON row objects.
 *
 * @param {Buffer} buffer - File buffer (.xlsx, .xls, or .csv)
 * @returns {{ sheetNames: string[], rows: Object[], total: number }}
 */
function parseExcelBuffer(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error('Valid Excel or CSV buffer is required for parsing');
    error.statusCode = 400;
    throw error;
  }

  try {
    const workbook = xlsx.read(buffer, {
      type: 'buffer',
      cellDates: true,
      raw: false,
    });

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return { sheetNames: [], rows: [], total: 0 };
    }

    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

    // Normalize keys: trim and lowercase
    const normalizedRows = rawRows.map((row) => {
      const cleanRow = {};
      Object.entries(row).forEach(([key, val]) => {
        const cleanKey = String(key || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
        cleanRow[cleanKey] = typeof val === 'string' ? val.trim() : val;
      });
      return cleanRow;
    });

    return {
      sheetNames: workbook.SheetNames,
      rows: normalizedRows,
      total: normalizedRows.length,
    };
  } catch (parseErr) {
    console.error('[Excel Parse Error]:', parseErr.message);
    const error = new Error(`Failed to parse spreadsheet file: ${parseErr.message}`);
    error.statusCode = 400;
    throw error;
  }
}

/**
 * Normalizes an imported patient row to match the patient schema.
 */
function normalizePatientRow(rawRow, rowNum = 1) {
  const rowObj = {};
  if (rawRow && typeof rawRow === 'object') {
    Object.entries(rawRow).forEach(([k, v]) => {
      const cleanKey = String(k || '').trim().toLowerCase().replace(/[\s_-]+/g, '_');
      rowObj[cleanKey] = v;
    });
  }

  const name =
    rowObj['name'] ||
    rowObj['full_name'] ||
    rowObj['patient_name'] ||
    rowObj['fullname'] ||
    '';

  const phone =
    rowObj['phone'] ||
    rowObj['phone_number'] ||
    rowObj['mobile'] ||
    rowObj['mobile_number'] ||
    rowObj['contact'] ||
    '';

  const email =
    rowObj['email'] ||
    rowObj['email_address'] ||
    rowObj['mail'] ||
    '';

  const dob =
    rowObj['dob'] ||
    rowObj['date_of_birth'] ||
    rowObj['birth_date'] ||
    rowObj['birthdate'] ||
    '';

  const rawGender = String(rowObj['gender'] || rowObj['sex'] || 'other').trim().toLowerCase();
  const gender = ['male', 'female', 'other'].includes(rawGender) ? rawGender : 'other';

  const street =
    rowObj['street'] ||
    rowObj['address'] ||
    rowObj['street_address'] ||
    '';

  const city = rowObj['city'] || '';
  const state = rowObj['state'] || '';
  const postal_code =
    rowObj['postal_code'] ||
    rowObj['pincode'] ||
    rowObj['zip'] ||
    rowObj['zip_code'] ||
    '';

  const family_group =
    rowObj['family_group'] ||
    rowObj['familygroup'] ||
    rowObj['family_id'] ||
    '';

  const relationship =
    rowObj['relationship'] ||
    rowObj['relation'] ||
    '';

  const medical_history =
    rowObj['medical_history'] ||
    rowObj['conditions'] ||
    rowObj['history'] ||
    '';

  const notes = rowObj['notes'] || rowObj['remarks'] || '';

  const errors = [];
  if (!name) errors.push('Name is required');
  if (!phone) errors.push('Phone is required');
  if (!email) errors.push('Email is required');
  else if (!email.includes('@')) errors.push('Invalid email format');

  return {
    rowNum,
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: String(email).trim().toLowerCase(),
    dob: dob ? String(dob).trim() : undefined,
    gender,
    address: {
      street: String(street).trim(),
      city: String(city).trim(),
      state: String(state).trim(),
      postal_code: String(postal_code).trim(),
      country: 'India',
    },
    family_group: family_group ? String(family_group).trim() : undefined,
    relationship: relationship ? String(relationship).trim() : undefined,
    medical_history: medical_history
      ? String(medical_history).split(/[;,|]+/).map((s) => s.trim()).filter(Boolean)
      : [],
    notes: notes ? String(notes).trim() : '',
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Generates an Excel buffer (.xlsx) from an array of JSON objects.
 *
 * @param {Object[]} data - Array of row objects
 * @param {Object} [options]
 * @param {string} [options.sheetName='Sheet1']
 * @returns {Buffer}
 */
function generateExcelBuffer(data, { sheetName = 'Sheet1' } = {}) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data && data.length > 0 ? data : [{}]);

  // Auto-calculate column widths
  if (data && data.length > 0) {
    const colKeys = Object.keys(data[0]);
    ws['!cols'] = colKeys.map((key) => {
      let maxLen = key.length;
      for (const row of data) {
        const valStr = row[key] ? String(row[key]) : '';
        if (valStr.length > maxLen) maxLen = Math.min(valStr.length, 50);
      }
      return { wch: maxLen + 3 };
    });
  }

  xlsx.utils.book_append_sheet(wb, ws, sheetName);
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generates a CSV buffer from an array of JSON objects.
 *
 * @param {Object[]} data
 * @returns {Buffer}
 */
function generateCsvBuffer(data) {
  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(data && data.length > 0 ? data : [{}]);
  const csvStr = xlsx.utils.sheet_to_csv(ws);
  return Buffer.from(csvStr, 'utf8');
}

/**
 * Uploads an Excel or CSV file to S3 and returns the S3 key and presigned download URL.
 *
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.filename - Desired filename
 * @param {string} [options.category='reports'] - Subcategory (reports, imports, exports)
 * @param {string} [options.module='excel'] - Module
 * @param {Object} [options.metadata={}] - Extra metadata
 * @returns {Promise<{ key: string, bucket: string, downloadUrl: string, filename: string, size: number }>}
 */
async function uploadExcelToS3({
  buffer,
  filename = `export-${Date.now()}.xlsx`,
  category = 'exports',
  module = 'excel',
  metadata = {},
}) {
  const ext = path.extname(filename).toLowerCase();
  const mimetype = ext === '.csv' ? MIME_CSV : ext === '.xls' ? MIME_XLS : MIME_XLSX;

  const key = s3Service.generateMediaKey({
    module,
    category,
    originalname: filename,
  });

  if (s3Service.isConfigured()) {
    const s3Result = await s3Service.uploadFile({
      buffer,
      key,
      module,
      category,
      originalname: filename,
      mimetype,
      metadata: {
        ...metadata,
        type: 'excel-spreadsheet',
      },
    });

    const presignedUrl = await s3Service.getPresignedDownloadUrl(key, {
      expiresIn: 3600, // 1 hour for downloads
      downloadFilename: filename,
      responseContentType: mimetype,
    });

    return {
      key,
      bucket: s3Result.bucket,
      downloadUrl: presignedUrl,
      filename,
      size: buffer.length,
      storage: 's3',
    };
  }

  return {
    key: `s3/${filename}`,
    bucket: 's3',
    downloadUrl: '',
    filename,
    size: buffer.length,
    storage: 's3',
  };
}

/**
 * Exports patients list to Excel or CSV, uploads to S3, and returns the download details.
 */
async function exportPatients({ query = {}, format = 'xlsx' } = {}) {
  const filter = {};
  if (query.search) {
    const term = query.search.trim();
    filter.$or = [
      { name: { $regex: term, $options: 'i' } },
      { phone: { $regex: term, $options: 'i' } },
      { email: { $regex: term, $options: 'i' } },
      { patientId: { $regex: term, $options: 'i' } },
    ];
  }

  const patients = await Patient.find(filter).sort({ created_at: -1 });

  const rows = patients.map((p) => {
    const addr = p.address || {};
    const street = typeof addr === 'string' ? addr : addr.street || '';
    const city = typeof addr === 'object' ? addr.city || '' : '';
    const state = typeof addr === 'object' ? addr.state || '' : '';
    const postal_code = typeof addr === 'object' ? addr.postal_code || '' : '';

    return {
      'Patient ID': p.patientId || '',
      'Full Name': p.name || '',
      'Phone': p.phone || '',
      'Email': p.email || '',
      'Gender': p.gender || '',
      'Date of Birth': p.dob ? new Date(p.dob).toISOString().split('T')[0] : '',
      'Street Address': street,
      'City': city,
      'State': state,
      'Postal Code': postal_code,
      'Family Group': p.family_group || '',
      'Relationship': p.relationship || '',
      'Medical History': Array.isArray(p.medical_history) ? p.medical_history.join('; ') : '',
      'Notes': p.notes || '',
      'Registered Date': p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
    };
  });

  const filename = `Patients_Export_${new Date().toISOString().split('T')[0]}.${format}`;
  const buffer = format === 'csv' ? generateCsvBuffer(rows) : generateExcelBuffer(rows, { sheetName: 'Patients' });

  const s3Upload = await uploadExcelToS3({
    buffer,
    filename,
    category: 'patients',
    module: 'patients',
    metadata: { count: String(rows.length) },
  });

  return {
    ...s3Upload,
    count: rows.length,
    buffer,
  };
}

/**
 * Exports appointments to Excel or CSV and uploads to S3.
 */
async function exportAppointments({ query = {}, format = 'xlsx' } = {}) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.startDate || query.endDate) {
    filter.appointmentDate = {};
    if (query.startDate) filter.appointmentDate.$gte = new Date(query.startDate);
    if (query.endDate) filter.appointmentDate.$lte = new Date(query.endDate);
  }

  const appointments = await Appointment.find(filter).sort({ appointmentDate: -1, createdAt: -1 });

  const rows = appointments.map((a) => ({
    'Appointment ID': a._id.toString(),
    'Patient Name': a.patientName || '',
    'Phone': a.patientPhone || '',
    'Email': a.patientEmail || '',
    'Date': a.appointmentDate ? new Date(a.appointmentDate).toISOString().split('T')[0] : '',
    'Time': a.appointmentTime || '',
    'Booking Type': a.bookingType || a.consultation_type || 'ONLINE',
    'Status': a.status || 'pending',
    'Payment Status': a.payment_status || 'pending',
    'Total Amount': a.totalAmount || a.amount || 0,
    'Concern': a.concern || a.customConcern || '',
    'City': a.city || '',
    'Notes': a.notes || '',
  }));

  const filename = `Appointments_Export_${new Date().toISOString().split('T')[0]}.${format}`;
  const buffer = format === 'csv' ? generateCsvBuffer(rows) : generateExcelBuffer(rows, { sheetName: 'Appointments' });

  const s3Upload = await uploadExcelToS3({
    buffer,
    filename,
    category: 'appointments',
    module: 'appointments',
    metadata: { count: String(rows.length) },
  });

  return {
    ...s3Upload,
    count: rows.length,
    buffer,
  };
}

/**
 * Exports orders to Excel or CSV and uploads to S3.
 */
async function exportOrders({ query = {}, format = 'xlsx' } = {}) {
  const filter = {};
  if (query.order_status) filter.order_status = query.order_status;
  if (query.payment_status) filter.payment_status = query.payment_status;

  const orders = await Order.find(filter).populate('items.product').sort({ created_at: -1 });

  const rows = orders.map((o) => ({
    'Order Number': o.order_number || '',
    'Customer Name': o.customer_name || '',
    'Phone': o.customer_phone || '',
    'Email': o.customer_email || '',
    'Total (INR)': o.total || 0,
    'Subtotal': o.subtotal || 0,
    'Discount': o.discount || 0,
    'Order Status': o.order_status || 'pending',
    'Payment Status': o.payment_status || 'pending',
    'Items Count': Array.isArray(o.items) ? o.items.length : 0,
    'Shipping City': o.shipping_address?.city || '',
    'Date': o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : '',
  }));

  const filename = `Orders_Export_${new Date().toISOString().split('T')[0]}.${format}`;
  const buffer = format === 'csv' ? generateCsvBuffer(rows) : generateExcelBuffer(rows, { sheetName: 'Orders' });

  const s3Upload = await uploadExcelToS3({
    buffer,
    filename,
    category: 'orders',
    module: 'orders',
    metadata: { count: String(rows.length) },
  });

  return {
    ...s3Upload,
    count: rows.length,
    buffer,
  };
}

/**
 * Exports products / inventory to Excel or CSV and uploads to S3.
 */
async function exportProducts({ query = {}, format = 'xlsx' } = {}) {
  const filter = {};
  if (query.category) filter.category = query.category;
  if (query.active !== undefined) filter.active = query.active === 'true';

  const products = await Product.find(filter).populate('category', 'name').sort({ created_at: -1 });

  const rows = products.map((p) => ({
    'SKU': p.sku || '',
    'Product Name': p.name || '',
    'Category': p.category?.name || 'Uncategorized',
    'Price (INR)': p.price || 0,
    'MRP / Compare Price': p.compare_price || '',
    'Stock': p.stock || 0,
    'In Stock': p.in_stock ? 'Yes' : 'No',
    'Status': p.active ? 'Active' : 'Inactive',
    'Featured': p.featured ? 'Yes' : 'No',
    'Recommended': p.recommended ? 'Yes' : 'No',
  }));

  const filename = `Products_Inventory_${new Date().toISOString().split('T')[0]}.${format}`;
  const buffer = format === 'csv' ? generateCsvBuffer(rows) : generateExcelBuffer(rows, { sheetName: 'Products' });

  const s3Upload = await uploadExcelToS3({
    buffer,
    filename,
    category: 'products',
    module: 'products',
    metadata: { count: String(rows.length) },
  });

  return {
    ...s3Upload,
    count: rows.length,
    buffer,
  };
}

/**
 * Handles full patient import from an uploaded Excel or CSV file:
 * 1. Uploads original file to S3 under `patients/imports/`
 * 2. Parses spreadsheet contents via XLSX
 * 3. Validates and normalizes columns
 * 4. Calls patientService.bulkImport
 * 5. Returns detailed import report with S3 reference
 */
async function importPatientsFile({ buffer, originalname = 'patients_import.xlsx', mimetype, userId }) {
  if (!buffer || buffer.length === 0) {
    const error = new Error('No file content provided for patient import');
    error.statusCode = 400;
    throw error;
  }

  // 1. Upload original import spreadsheet to S3 for durable audit trail
  let s3Key = null;
  let s3DownloadUrl = null;
  if (s3Service.isConfigured()) {
    try {
      const s3Upload = await uploadExcelToS3({
        buffer,
        filename: originalname,
        category: 'imports',
        module: 'patients',
        metadata: {
          uploadedby: String(userId || 'admin'),
          importedat: new Date().toISOString(),
        },
      });
      s3Key = s3Upload.key;
      s3DownloadUrl = s3Upload.downloadUrl;
    } catch (s3Err) {
      console.warn('[Excel Import S3 Archive Warning]:', s3Err.message);
    }
  }

  // 2. Parse spreadsheet buffer
  const { rows } = parseExcelBuffer(buffer);
  if (!rows || rows.length === 0) {
    const error = new Error('Spreadsheet contains no records to import');
    error.statusCode = 400;
    throw error;
  }

  // 3. Normalize and map rows
  const parsedRows = rows.map((r, i) => normalizePatientRow(r, i + 1));

  const validPatients = [];
  const validationErrors = [];

  parsedRows.forEach((row) => {
    if (row.isValid) {
      validPatients.push({
        name: row.name,
        phone: row.phone,
        email: row.email,
        dob: row.dob,
        gender: row.gender,
        address: row.address,
        family_group: row.family_group,
        relationship: row.relationship,
        medical_history: row.medical_history,
        notes: row.notes,
      });
    } else {
      validationErrors.push({
        row: row.rowNum,
        name: row.name || 'Unknown',
        reason: row.errors.join(', '),
      });
    }
  });

  // 4. Execute bulk import through patient service
  let importResult = { total: 0, successful: 0, failed: 0, errors: [], created: [] };
  if (validPatients.length > 0) {
    importResult = await patientService.bulkImport(validPatients, userId);
  }

  // Combine validation errors and database duplicate errors
  const combinedErrors = [...validationErrors, ...(importResult.errors || [])];

  return {
    total: parsedRows.length,
    successful: importResult.successful || 0,
    failed: combinedErrors.length,
    errors: combinedErrors,
    created: importResult.created || [],
    s3Key,
    downloadUrl: s3DownloadUrl,
    filename: originalname,
  };
}

module.exports = {
  MIME_XLSX,
  MIME_XLS,
  MIME_CSV,
  parseExcelBuffer,
  normalizePatientRow,
  generateExcelBuffer,
  generateCsvBuffer,
  uploadExcelToS3,
  exportPatients,
  exportAppointments,
  exportOrders,
  exportProducts,
  importPatientsFile,
};
