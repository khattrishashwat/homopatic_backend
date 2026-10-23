const multer = require('multer');
const path = require('path');

// Memory storage for S3 uploads (keeps buffer in memory for direct S3 upload & signature validation)
const memoryStorage = multer.memoryStorage();

const allowedMimeTypes = new Set([
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
  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'application/octet-stream', // Some Excel uploads send octet-stream
]);

const fileFilter = (req, file, cb) => {
  const mime = (file.mimetype || '').toLowerCase();
  const ext = path.extname(file.originalname || '').toLowerCase();

  const allowedExts = new Set([
    '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.ico',
    '.mp4', '.webm', '.mov', '.avi', '.mpeg',
    '.pdf', '.txt',
    '.xlsx', '.xls', '.csv',
  ]);

  if (allowedMimeTypes.has(mime) || allowedExts.has(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${mime || ext}`), false);
  }
};

// Memory storage uploader (default for S3)
const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max (videos / spreadsheets)
  fileFilter,
});

// Default export uses memoryStorage for modern S3 workflow
const upload = memoryUpload;
upload.memory = memoryUpload;
upload.disk = memoryUpload;

module.exports = upload;
