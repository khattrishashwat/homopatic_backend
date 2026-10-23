const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'mdshomoeopathy-patient-files-2026';
const AWS_S3_PREFIX = (process.env.AWS_S3_PREFIX || '').replace(/^\/+|\/+$/g, '');

const s3ClientConfig = {
  region: AWS_REGION,
};

if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
  s3ClientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
  };
}

const s3Client = new S3Client(s3ClientConfig);

// Primary allowed patient file types (kept for full backward compatibility)
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.pdf',
  '.xlsx',
  '.xls',
  '.csv',
]);

// Comprehensive application-wide media types
const ALL_ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  // Videos
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/mpeg',
  // Documents
  'application/pdf',
  'text/plain',
  // Spreadsheets / Excel
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
]);

const ALL_ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.ico',
  '.mp4',
  '.webm',
  '.mov',
  '.avi',
  '.mpeg',
  '.mpg',
  '.pdf',
  '.txt',
  '.xlsx',
  '.xls',
  '.csv',
]);

// Size Limits by Media Category
const parsedMaxSize = parseInt(process.env.MAX_FILE_SIZE, 10) || 5242880;
const MAX_FILE_SIZE_BYTES = parsedMaxSize > 1000 ? parsedMaxSize : parsedMaxSize * 1024 * 1024; // 5 MB for patients
const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024;       // 15 MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;      // 100 MB
const MAX_EXCEL_SIZE_BYTES = 30 * 1024 * 1024;       // 30 MB
const MAX_DOC_SIZE_BYTES = 25 * 1024 * 1024;         // 25 MB

// Permitted prefix namespaces to protect against path traversal
const ALLOWED_PREFIXES = [
  'patients/',
  'prescriptions/',
  'products/',
  'blogs/',
  'settings/',
  'excel/',
  'media/',
  'videos/',
  'appointments/',
  'orders/',
];
if (AWS_S3_PREFIX) {
  ALLOWED_PREFIXES.push(`${AWS_S3_PREFIX}/`);
}

/**
 * Validates file magic bytes against its declared MIME type.
 */
function validateFileSignature(buffer, mimetypeOrFilename) {
  if (!buffer || buffer.length < 4) {
    return false;
  }

  let mime = (mimetypeOrFilename || '').toLowerCase();
  if (mime.endsWith('.jpg') || mime.endsWith('.jpeg')) mime = 'image/jpeg';
  else if (mime.endsWith('.png')) mime = 'image/png';
  else if (mime.endsWith('.webp')) mime = 'image/webp';
  else if (mime.endsWith('.gif')) mime = 'image/gif';
  else if (mime.endsWith('.pdf')) mime = 'application/pdf';
  else if (mime.endsWith('.mp4')) mime = 'video/mp4';
  else if (mime.endsWith('.webm')) mime = 'video/webm';
  else if (mime.endsWith('.xlsx')) mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  else if (mime.endsWith('.xls')) mime = 'application/vnd.ms-excel';
  else if (mime.endsWith('.csv') || mime.endsWith('.txt')) mime = 'text/csv';

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return !mime || mime.includes('jpeg') || mime.includes('jpg');
  }

  // PNG: 89 50 4E 47 (0D 0A 1A 0A)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return !mime || mime.includes('png');
  }

  // PDF: 25 50 44 46 (%PDF)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return !mime || mime.includes('pdf');
  }

  // WEBP: starts with "RIFF" (52 49 46 46) and has "WEBP" (57 45 42 50) at bytes 8-11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return !mime || mime.includes('webp');
  }

  // GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return !mime || mime.includes('gif');
  }

  // MP4 / QuickTime: bytes 4-8 is "ftyp" (66 74 79 70) or "moov" (6d 6f 6f 76)
  if (
    buffer.length >= 8 &&
    ((buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) ||
      (buffer[4] === 0x6d && buffer[5] === 0x6f && buffer[6] === 0x6f && buffer[7] === 0x76))
  ) {
    return !mime || mime.includes('mp4') || mime.includes('quicktime') || mime.includes('video');
  }

  // WEBM / MKV: 1A 45 DF A3 (EBML header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return !mime || mime.includes('webm') || mime.includes('matroska') || mime.includes('video');
  }

  // XLSX (Zip archive container): 50 4B 03 04 (PK..)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return (
      !mime ||
      mime.includes('spreadsheetml') ||
      mime.includes('zip') ||
      mime.includes('excel') ||
      mime.includes('openxml')
    );
  }

  // XLS (Compound Binary / OLE2 container): D0 CF 11 E0 A1 B1 1A E1
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return !mime || mime.includes('ms-excel') || mime.includes('excel');
  }

  // SVG: starts with XML or SVG tag (<svg or <?xml)
  const headStr = buffer.slice(0, 100).toString('utf8').trim().toLowerCase();
  if (headStr.startsWith('<svg') || headStr.startsWith('<?xml') || headStr.includes('<svg')) {
    return !mime || mime.includes('svg') || mime.includes('xml');
  }

  // ICO: 00 00 01 00
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && buffer[3] === 0x00) {
    return !mime || mime.includes('icon') || mime.includes('ico');
  }

  // CSV / Plain Text: Printable ASCII / UTF-8 without control null bytes
  if (mime.includes('csv') || mime.includes('text')) {
    const sample = buffer.slice(0, Math.min(buffer.length, 1024));
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return false; // Null byte indicates raw binary
    }
    return true;
  }

  return false;
}

/**
 * Validates patient file metadata, size, extension, and magic bytes.
 * Kept strictly conforming for patient compliance tests.
 */
function validatePatientFile({ buffer, originalname, mimetype, size }) {
  if (!originalname && !mimetype) {
    const error = new Error('File information missing');
    error.statusCode = 400;
    throw error;
  }

  const effectiveSize = size || (buffer ? buffer.length : 0);
  if (effectiveSize > MAX_FILE_SIZE_BYTES) {
    const error = new Error(`File size exceeds maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
    error.statusCode = 400;
    throw error;
  }

  if (effectiveSize === 0 && !buffer) {
    const error = new Error('File buffer is empty');
    error.statusCode = 400;
    throw error;
  }

  const ext = originalname ? path.extname(originalname).toLowerCase() : '';
  if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File extension '${ext}' is not allowed. Supported extensions: .jpg, .jpeg, .png, .webp, .pdf, .xlsx, .xls, .csv`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedMime = (mimetype || '').toLowerCase();
  if (normalizedMime && !ALLOWED_MIME_TYPES.has(normalizedMime)) {
    const error = new Error(`File MIME type '${normalizedMime}' is not allowed`);
    error.statusCode = 400;
    throw error;
  }

  if (buffer && buffer.length >= 4) {
    const signatureValid = validateFileSignature(buffer, normalizedMime);
    if (!signatureValid) {
      const error = new Error('File signature does not match its declared type');
      error.statusCode = 400;
      throw error;
    }
  }

  return true;
}

/**
 * Validates generic media (images, videos, excel files, docs).
 */
function validateMediaFile({ buffer, originalname, mimetype, size, category = 'image' }) {
  if (!originalname && !mimetype) {
    const error = new Error('File information missing');
    error.statusCode = 400;
    throw error;
  }

  const effectiveSize = size || (buffer ? buffer.length : 0);
  let maxAllowed = MAX_IMAGE_SIZE_BYTES;
  if (category === 'video' || (mimetype && mimetype.startsWith('video/'))) {
    maxAllowed = MAX_VIDEO_SIZE_BYTES;
  } else if (category === 'excel' || (mimetype && (mimetype.includes('excel') || mimetype.includes('csv') || mimetype.includes('spreadsheet')))) {
    maxAllowed = MAX_EXCEL_SIZE_BYTES;
  } else if (category === 'document' || (mimetype && mimetype.includes('pdf'))) {
    maxAllowed = MAX_DOC_SIZE_BYTES;
  }

  if (effectiveSize > maxAllowed) {
    const error = new Error(`File size exceeds maximum allowed limit of ${Math.round(maxAllowed / (1024 * 1024))} MB`);
    error.statusCode = 400;
    throw error;
  }

  const ext = originalname ? path.extname(originalname).toLowerCase() : '';
  if (ext && !ALL_ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File extension '${ext}' is not allowed.`);
    error.statusCode = 400;
    throw error;
  }

  const normalizedMime = (mimetype || '').toLowerCase();
  if (normalizedMime && !ALL_ALLOWED_MIME_TYPES.has(normalizedMime)) {
    const error = new Error(`File MIME type '${normalizedMime}' is not allowed`);
    error.statusCode = 400;
    throw error;
  }

  if (buffer && buffer.length >= 4) {
    const signatureValid = validateFileSignature(buffer, normalizedMime);
    if (!signatureValid) {
      const error = new Error('File signature does not match its declared type');
      error.statusCode = 400;
      throw error;
    }
  }

  return true;
}

/**
 * Generates collision-resistant S3 object key strictly scoped under 'patients/'.
 * Retained for exact backward compatibility with patient test suites.
 */
function generatePatientS3Key(arg1, arg2, arg3) {
  let patientId = 'general';
  let category = 'records';
  let originalname = 'file.bin';

  if (typeof arg1 === 'object' && arg1 !== null) {
    patientId = arg1.patientId || patientId;
    category = arg1.category || category;
    originalname = arg1.originalname || originalname;
  } else {
    patientId = arg1 || patientId;
    originalname = arg2 || originalname;
    category = arg3 || category;
  }

  const safePatientId = String(patientId)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 64);
  const safeCategory = String(category)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);
  const ext = path.extname(originalname).toLowerCase() || '.bin';
  const uniqueId = `${Date.now()}-${uuidv4()}`;

  return `patients/${safePatientId}/${safeCategory}/${uniqueId}${ext}`;
}

/**
 * Generates an organized S3 key for any application module:
 * `products/{productId}/images/{uniqueId}{ext}`
 * `blogs/{blogId}/{uniqueId}{ext}`
 * `settings/{logo|favicon}/{uniqueId}{ext}`
 * `excel/imports/{uniqueId}{ext}`
 * `videos/{recordId}/{uniqueId}{ext}`
 */
function generateMediaKey({ module = 'media', recordId = 'general', category = '', originalname = 'file.bin' }) {
  const safeModule = String(module).toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 32);
  const safeRecordId = String(recordId).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  const safeCategory = String(category).toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 32);
  const ext = path.extname(originalname).toLowerCase() || '.bin';
  const uniqueId = `${Date.now()}-${uuidv4()}`;

  const parts = [];
  if (AWS_S3_PREFIX) parts.push(AWS_S3_PREFIX);
  parts.push(safeModule);
  if (safeRecordId && safeRecordId !== 'general') parts.push(safeRecordId);
  if (safeCategory) parts.push(safeCategory);
  parts.push(`${uniqueId}${ext}`);

  return parts.join('/');
}

/**
 * Checks whether AWS S3 bucket and region configuration are present.
 */
function hasCredentials() {
  const hasKeys = Boolean(process.env.AWS_ACCESS_KEY_ID?.trim() && process.env.AWS_SECRET_ACCESS_KEY?.trim());
  return hasKeys || Boolean(process.env.AWS_PROFILE) || Boolean(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI);
}

function isConfigured() {
  const hasBucketAndRegion = Boolean(process.env.AWS_S3_BUCKET && process.env.AWS_REGION);
  return hasBucketAndRegion && (hasCredentials() || process.env.NODE_ENV === 'production');
}

/**
 * Uploads a patient file to S3 under 'patients/'.
 * Conforms 100% to existing patient unit/integration tests.
 */
async function uploadPatientFile({
  buffer,
  filePath,
  patientId,
  category = 'records',
  originalname = 'document.bin',
  mimetype = 'application/octet-stream',
  metadata = {},
}) {
  let fileBuffer = buffer;

  if (!fileBuffer && filePath) {
    fileBuffer = await fs.promises.readFile(filePath);
  }

  if (!fileBuffer) {
    const error = new Error('No file content provided for S3 upload');
    error.statusCode = 400;
    throw error;
  }

  validatePatientFile({
    buffer: fileBuffer,
    originalname,
    mimetype,
    size: fileBuffer.length,
  });

  const key = generatePatientS3Key({ patientId, category, originalname });

  const safeMetadata = {};
  if (patientId) safeMetadata.patientid = String(patientId).replace(/[^a-zA-Z0-9_-]/g, '_');
  if (originalname) safeMetadata.originalname = encodeURIComponent(path.basename(originalname)).slice(0, 100);
  safeMetadata.uploadedat = new Date().toISOString();
  Object.entries(metadata).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      safeMetadata[k.toLowerCase().replace(/[^a-z0-9_-]/g, '')] = String(v).slice(0, 100);
    }
  });

  try {
    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimetype,
      Metadata: safeMetadata,
    });

    await s3Client.send(command);

    const canonicalUrl = getCanonicalUrl(key);
    const presignedUrl = await getPresignedDownloadUrl(key, { expiresIn: 86400 }).catch(() => null);

    return {
      key,
      s3Key: key,
      bucket: AWS_S3_BUCKET,
      size: fileBuffer.length,
      contentType: mimetype,
      originalname: path.basename(originalname),
      storage: 's3',
      url: presignedUrl || canonicalUrl,
      canonicalUrl,
    };
  } catch (awsError) {
    if (awsError.message?.includes('Could not load credentials') || !hasCredentials()) {
      console.error('[AWS S3 Error]: AWS credentials not found! Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env');
      const credError = new Error('AWS credentials missing! Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env');
      credError.statusCode = 500;
      throw credError;
    }
    console.error('[AWS S3 Patient Upload Error]:', awsError.message || awsError);
    const error = new Error('Failed to upload patient document to secure storage');
    error.statusCode = 502;
    error.cause = awsError.name;
    throw error;
  }
}

/**
 * Production-ready generic S3 upload service:
 * Supports Images, Videos, Spreadsheets (Excel / CSV), and Documents.
 * Automatically switches to multipart Upload via @aws-sdk/lib-storage for files > 5MB.
 *
 * @param {Object} options
 * @param {Buffer} [options.buffer] - File Buffer
 * @param {string} [options.filePath] - On-disk path if reading from file
 * @param {Readable} [options.stream] - Direct stream
 * @param {string} [options.key] - Custom explicit S3 object key (optional)
 * @param {string} [options.module='media'] - Target module name (products, blogs, settings, excel, patients)
 * @param {string} [options.recordId='general'] - Record ID or identifier
 * @param {string} [options.category=''] - Subcategory
 * @param {string} options.originalname - Original client filename
 * @param {string} [options.mimetype] - Declared MIME type
 * @param {Object} [options.metadata={}] - User metadata
 * @returns {Promise<{ key: string, bucket: string, size: number, contentType: string, originalname: string, url: string }>}
 */
async function uploadFile({
  buffer,
  filePath,
  stream,
  key: explicitKey,
  module = 'media',
  recordId = 'general',
  category = '',
  originalname = 'file.bin',
  mimetype = 'application/octet-stream',
  metadata = {},
}) {
  let fileBuffer = buffer;

  if (!fileBuffer && filePath) {
    fileBuffer = await fs.promises.readFile(filePath);
  }

  if (!fileBuffer && !stream) {
    const error = new Error('No file content provided for S3 upload');
    error.statusCode = 400;
    throw error;
  }

  // Content validation
  if (fileBuffer) {
    validateMediaFile({
      buffer: fileBuffer,
      originalname,
      mimetype,
      size: fileBuffer.length,
      category,
    });
  }

  const key = explicitKey || generateMediaKey({ module, recordId, category, originalname });

  const safeMetadata = {
    uploadedat: new Date().toISOString(),
    module: String(module).slice(0, 50),
    originalname: encodeURIComponent(path.basename(originalname)).slice(0, 100),
  };

  Object.entries(metadata).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      safeMetadata[k.toLowerCase().replace(/[^a-z0-9_-]/g, '')] = String(v).slice(0, 100);
    }
  });

  const effectiveSize = fileBuffer ? fileBuffer.length : undefined;

  try {
    // If larger than 5 MB or streaming, use multipart upload with @aws-sdk/lib-storage
    if (stream || (fileBuffer && fileBuffer.length > 5 * 1024 * 1024)) {
      const parallelUpload = new Upload({
        client: s3Client,
        params: {
          Bucket: AWS_S3_BUCKET,
          Key: key,
          Body: stream || fileBuffer,
          ContentType: mimetype,
          Metadata: safeMetadata,
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
        leavePartsOnError: false,
      });

      await parallelUpload.done();
    } else {
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: mimetype,
        Metadata: safeMetadata,
      });

      await s3Client.send(command);
    }

    // Generate canonical URL and a fresh presigned URL for immediate consumption (valid for 24 hours)
    const canonicalUrl = getCanonicalUrl(key);
    const presignedUrl = await getPresignedDownloadUrl(key, { expiresIn: 86400 }).catch(() => null);

    return {
      key,
      s3Key: key,
      bucket: AWS_S3_BUCKET,
      size: effectiveSize,
      contentType: mimetype,
      originalname: path.basename(originalname),
      storage: 's3',
      url: presignedUrl || canonicalUrl,
      canonicalUrl,
    };
  } catch (awsError) {
    if (awsError.message?.includes('Could not load credentials') || !hasCredentials()) {
      console.error(`[AWS S3 Error - ${module}]: AWS credentials not found! Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env`);
      const credError = new Error('AWS credentials missing! Please configure AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in backend/.env');
      credError.statusCode = 500;
      throw credError;
    }
    console.error(`[AWS S3 Upload Error - ${module}]:`, awsError.message || awsError);
    const error = new Error(`Failed to upload ${module} file to secure storage`);
    error.statusCode = 502;
    error.cause = awsError.name;
    throw error;
  }
}

/**
 * Generates a short-lived presigned URL for downloading or viewing any authorized object.
 * Validates key namespace to prevent traversal and unauthorized bucket guessing.
 *
 * @param {string} key - S3 object key
 * @param {Object} [options]
 * @param {number} [options.expiresIn=900] - Expiration in seconds (default 15 minutes)
 * @param {string} [options.downloadFilename] - If provided, sets attachment filename
 * @param {string} [options.responseContentType] - Override content-type
 * @returns {Promise<string>} Presigned URL
 */
async function getPresignedDownloadUrl(key, { expiresIn = 900, downloadFilename, responseContentType } = {}) {
  if (!key || typeof key !== 'string') {
    throw new Error('S3 key is required to generate presigned download URL');
  }

  // Prevent path traversal
  if (key.includes('..') || key.startsWith('/')) {
    const error = new Error('Access denied: invalid S3 key path');
    error.statusCode = 400;
    throw error;
  }

  // Verify key starts with an authorized prefix
  const isAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
  if (!isAllowedPrefix) {
    const error = new Error("Access denied: only 'patients/*' and authorized application object keys are allowed");
    error.statusCode = 403;
    throw error;
  }

  try {
    const commandParams = {
      Bucket: AWS_S3_BUCKET,
      Key: key,
    };

    if (downloadFilename) {
      const safeFilename = path.basename(downloadFilename).replace(/"/g, '');
      commandParams.ResponseContentDisposition = `attachment; filename="${safeFilename}"`;
    }

    if (responseContentType) {
      commandParams.ResponseContentType = responseContentType;
    }

    const command = new GetObjectCommand(commandParams);
    return await getSignedUrl(s3Client, command, { expiresIn });
  } catch (awsError) {
    if (awsError.statusCode) throw awsError;
    console.error('[AWS S3 Presigned URL Error]:', awsError.message || awsError);
    const error = new Error('Failed to generate secure download link');
    error.statusCode = 502;
    throw error;
  }
}

/**
 * Retrieves the object stream from S3 for backend processing (e.g., parsing Excel imports or streaming files).
 *
 * @param {string} key - S3 object key
 * @returns {Promise<{ stream: Readable, contentType: string, contentLength: number, lastModified: Date, metadata: Object }>}
 */
async function getFileStream(key) {
  if (!key || typeof key !== 'string') {
    const error = new Error('S3 key is required');
    error.statusCode = 400;
    throw error;
  }

  if (key.includes('..') || key.startsWith('/')) {
    const error = new Error('Access denied: invalid S3 key path');
    error.statusCode = 400;
    throw error;
  }

  const isAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
  if (!isAllowedPrefix) {
    const error = new Error("Access denied: only 'patients/*' and authorized application object keys are allowed");
    error.statusCode = 403;
    throw error;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });

    const response = await s3Client.send(command);

    return {
      stream: response.Body,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata || {},
    };
  } catch (awsError) {
    if (awsError.name === 'NoSuchKey' || awsError.$metadata?.httpStatusCode === 404) {
      const error = new Error('File not found in storage');
      error.statusCode = 404;
      throw error;
    }
    console.error('[AWS S3 GetStream Error]:', awsError.message || awsError);
    const error = new Error('Failed to retrieve file from secure storage');
    error.statusCode = 502;
    throw error;
  }
}

/**
 * Reads an entire object from S3 into a Buffer.
 * Convenient for Excel parser or in-memory processing.
 */
async function getFileBuffer(key) {
  const { stream } = await getFileStream(key);
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * Deletes any application object from S3.
 */
async function deleteFile(key) {
  if (!key || typeof key !== 'string') return false;

  const isAllowedPrefix = ALLOWED_PREFIXES.some((prefix) => key.startsWith(prefix));
  if (!isAllowedPrefix) return false;

  try {
    const command = new DeleteObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (awsError) {
    console.warn(`[AWS S3 Delete Warning]: Could not delete object ${key}:`, awsError.message);
    return false;
  }
}

/**
 * Backward compatibility alias for patient file deletion.
 */
async function deletePatientFile(key) {
  return await deleteFile(key);
}

/**
 * Checks S3 bucket accessibility.
 */
async function checkBucketAccess() {
  try {
    const command = new HeadObjectCommand({
      Bucket: AWS_S3_BUCKET,
      Key: 'patients/',
    });
    await s3Client.send(command).catch((err) => {
      // 404 is acceptable; indicates bucket is reachable and credentials validated
      if (err.$metadata?.httpStatusCode !== 404 && err.name !== 'NotFound') {
        throw err;
      }
    });
    return { success: true, bucket: AWS_S3_BUCKET, region: AWS_REGION };
  } catch (error) {
    return { success: false, bucket: AWS_S3_BUCKET, region: AWS_REGION, error: error.message };
  }
}

function getCanonicalUrl(key) {
  if (!key || typeof key !== 'string') return '';
  if (key.startsWith('http://') || key.startsWith('https://')) return key;
  return `https://${AWS_S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key.replace(/^\/+/, '')}`;
}

module.exports = {
  s3Client,
  AWS_REGION,
  AWS_S3_BUCKET,
  AWS_S3_PREFIX,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  ALL_ALLOWED_MIME_TYPES,
  ALL_ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  MAX_VIDEO_SIZE_BYTES,
  MAX_EXCEL_SIZE_BYTES,
  MAX_DOC_SIZE_BYTES,
  isConfigured,
  hasCredentials,
  validateFileSignature,
  validatePatientFile,
  validateMediaFile,
  generatePatientS3Key,
  generateMediaKey,
  uploadPatientFile,
  uploadFile,
  getPresignedDownloadUrl,
  getCanonicalUrl,
  getFileStream,
  getFileBuffer,
  deleteFile,
  deletePatientFile,
  checkBucketAccess,
};
