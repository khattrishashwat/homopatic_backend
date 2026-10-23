const s3Service = require('../../services/s3Service');

/**
 * Universal media upload endpoint for Admin Dashboard.
 * Uploads all Images, Videos, Documents, and Spreadsheets directly to S3 (no local disk storage).
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { module = 'media', recordId = 'general', category = '' } = req.body;

    const s3Result = await s3Service.uploadFile({
      buffer: req.file.buffer,
      module,
      recordId,
      category,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      metadata: {
        uploadedby: String(req.user?._id || 'admin'),
        role: String(req.user?.role || 'admin'),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Media uploaded successfully to S3',
      data: s3Result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates an authorized fresh presigned URL for any protected application S3 key.
 */
exports.getPresignedUrl = async (req, res, next) => {
  try {
    const { key, downloadFilename } = req.query;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ success: false, message: 'S3 key is required' });
    }

    const expiresIn = parseInt(req.query.expiresIn, 10) || 900; // 15 mins default

    const url = await s3Service.getPresignedDownloadUrl(key, {
      expiresIn,
      downloadFilename: downloadFilename ? String(downloadFilename) : undefined,
    });

    res.json({
      success: true,
      data: {
        key,
        url,
        expiresIn,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Streams or proxies an S3 media object directly to authorized clients.
 */
exports.streamMedia = async (req, res, next) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ success: false, message: 'S3 key is required' });
    }

    const fileStreamResult = await s3Service.getFileStream(key);
    res.setHeader('Content-Type', fileStreamResult.contentType);
    if (fileStreamResult.contentLength) {
      res.setHeader('Content-Length', fileStreamResult.contentLength);
    }
    const safeName = path.basename(key);
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);

    fileStreamResult.stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes an authorized media object from S3.
 */
exports.deleteMedia = async (req, res, next) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'S3 key is required' });
    }

    await s3Service.deleteFile(key);
    res.json({ success: true, message: 'Media removed from secure storage' });
  } catch (error) {
    next(error);
  }
};
