const multer = require('multer');
const path = require('path');
const { ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, MAX_FILE_SIZE_BYTES } = require('../services/s3Service');


const memoryStorage = multer.memoryStorage();

const patientFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    const error = new Error(`Invalid file type '${ext || mime}'. Allowed types: JPG, PNG, WEBP, PDF`);
    error.statusCode = 400;
    return cb(error, false);
  }

  cb(null, true);
};

const upload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES, // 5 MB
    files: 80, 
  },
  fileFilter: patientFileFilter,
});


function handleMulterErrors(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: `File size exceeds the maximum allowed limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files uploaded at once. Maximum 80 files allowed.',
          });
        }
        return res.status(err.statusCode || 400).json({
          success: false,
          message: err.message || 'File upload error',
        });
      }
      next();
    });
  };
}

module.exports = {
  uploadSingle: (fieldName = 'record') => handleMulterErrors(upload.single(fieldName)),
  uploadArray: (fieldName = 'records', maxCount = 80) => handleMulterErrors(upload.array(fieldName, maxCount)),
  uploadFields: (fieldsArray) => handleMulterErrors(upload.fields(fieldsArray)),
};
