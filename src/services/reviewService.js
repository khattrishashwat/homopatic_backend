const Review = require('../models/Review');
const googleReviewsService = require('./googleReviewsService');

/**
 * Normalize text for duplicate comparison (trim, lowercase, punctuation stripped, spaces collapsed)
 */
const normalizeString = (str) => {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Generate composite duplicate key from author, review content, and date
 */
const getCompositeKey = (authorName, reviewText, dateStr = '') => {
  return `${normalizeString(authorName)}:::${normalizeString(reviewText)}:::${dateStr}`;
};

/**
 * Bulk upload Google Reviews with duplicate prevention and validation
 */
exports.bulkUploadReviews = async (items) => {
  if (!Array.isArray(items)) {
    const error = new Error('Invalid payload: expected an array of reviews or { reviews: [...] }');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];
  const duplicates = [];
  const validDocs = [];
  const seenBatchGoogleIds = new Set();
  const seenBatchComposites = new Set();

  // 1. Fetch existing Google Reviews once to avoid N+1 database queries
  const existingReviews = await Review.find({
    type: { $in: ['google_review', 'testimonial'] },
  })
    .select('name message reviewDate createdAt googleReviewId')
    .lean();

  const existingGoogleIdSet = new Set();
  const existingCompositeSet = new Set();

  for (const r of existingReviews) {
    if (r.googleReviewId) {
      existingGoogleIdSet.add(r.googleReviewId.trim());
    }

    let dateStr = '';
    const d = r.reviewDate || r.createdAt;
    if (d) {
      const parsed = new Date(d);
      if (!isNaN(parsed.getTime())) {
        dateStr = parsed.toISOString().split('T')[0];
      }
    }

    existingCompositeSet.add(getCompositeKey(r.name, r.message, dateStr));
    if (dateStr) {
      existingCompositeSet.add(getCompositeKey(r.name, r.message, ''));
    }
  }

  // 2. Process and validate each record
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item || typeof item !== 'object') {
      errors.push({
        index: i,
        error: 'Record must be a valid object',
      });
      continue;
    }

    const authorNameRaw =
      item.authorName || item.name || item.reviewerName || item.reviewer_name;
    const authorName = typeof authorNameRaw === 'string' ? authorNameRaw.trim() : '';

    const reviewTextRaw =
      item.review || item.message || item.comment || item.reviewText || item.text;
    const reviewText = typeof reviewTextRaw === 'string' ? reviewTextRaw.trim() : '';

    const ratingVal = item.rating !== undefined ? item.rating : 5;
    const ratingNum = Number(ratingVal);

    if (!authorName) {
      errors.push({
        index: i,
        error: 'Author name is required and cannot be empty',
      });
      continue;
    }

    if (authorName.length > 100) {
      errors.push({
        index: i,
        authorName,
        error: 'Author name cannot exceed 100 characters',
      });
      continue;
    }

    if (!reviewText) {
      errors.push({
        index: i,
        authorName,
        error: 'Review text is required and cannot be empty',
      });
      continue;
    }

    if (reviewText.length > 2000) {
      errors.push({
        index: i,
        authorName,
        error: 'Review text cannot exceed 2000 characters',
      });
      continue;
    }

    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      errors.push({
        index: i,
        authorName,
        rating: ratingVal,
        error: 'Rating must be a number between 1 and 5',
      });
      continue;
    }

    // Validate review date if supplied
    const reviewDateRaw = item.reviewDate || item.date || item.createdAt;
    let parsedDate = null;
    let dateStr = '';
    if (reviewDateRaw) {
      parsedDate = new Date(reviewDateRaw);
      if (isNaN(parsedDate.getTime())) {
        errors.push({
          index: i,
          authorName,
          reviewDate: reviewDateRaw,
          error: 'Invalid review date format',
        });
        continue;
      }
      dateStr = parsedDate.toISOString().split('T')[0];
    }

    // 3. Duplicate checks
    const googleIdRaw = item.googleReviewId || item.reviewId || item.id;
    const googleId = typeof googleIdRaw === 'string' && googleIdRaw.trim() ? googleIdRaw.trim() : null;

    let isDuplicate = false;

    if (googleId) {
      if (existingGoogleIdSet.has(googleId)) {
        duplicates.push({
          index: i,
          authorName,
          googleReviewId: googleId,
          reason: 'Duplicate Google Review ID in database',
        });
        isDuplicate = true;
      } else if (seenBatchGoogleIds.has(googleId)) {
        duplicates.push({
          index: i,
          authorName,
          googleReviewId: googleId,
          reason: 'Duplicate Google Review ID within upload batch',
        });
        isDuplicate = true;
      }
    }

    if (isDuplicate) {
      continue;
    }

    const compKey = getCompositeKey(authorName, reviewText, dateStr);
    const compKeyNoDate = getCompositeKey(authorName, reviewText, '');

    if (existingCompositeSet.has(compKey) || (dateStr && existingCompositeSet.has(compKeyNoDate))) {
      duplicates.push({
        index: i,
        authorName,
        reason: 'Duplicate review (matching author, content, and date)',
      });
      continue;
    }

    if (seenBatchComposites.has(compKey) || (dateStr && seenBatchComposites.has(compKeyNoDate))) {
      duplicates.push({
        index: i,
        authorName,
        reason: 'Duplicate review within upload batch',
      });
      continue;
    }

    // Record keys in batch tracking sets
    if (googleId) {
      seenBatchGoogleIds.add(googleId);
    }
    seenBatchComposites.add(compKey);
    if (dateStr) {
      seenBatchComposites.add(compKeyNoDate);
    }

    const activeVal =
      item.active !== undefined
        ? item.active
        : item.approved !== undefined
        ? item.approved
        : true;

    const doc = {
      type: item.type || 'google_review',
      name: authorName,
      message: reviewText,
      rating: ratingNum,
      approved: Boolean(activeVal),
      order: Number.isInteger(Number(item.order)) ? Number(item.order) : 0,
      source: typeof item.source === 'string' && item.source.trim() ? item.source.trim() : 'google',
    };

    if (googleId) {
      doc.googleReviewId = googleId;
    }

    if (parsedDate) {
      doc.reviewDate = parsedDate;
      doc.createdAt = parsedDate;
    }

    if (typeof item.profileImage === 'string' && item.profileImage.trim()) {
      doc.profileImage = item.profileImage.trim();
    }

    if (typeof item.relativeTime === 'string' && item.relativeTime.trim()) {
      doc.relativeTime = item.relativeTime.trim();
    } else if (parsedDate) {
      doc.relativeTime = parsedDate.toLocaleDateString();
    }

    if (typeof item.reply === 'string' && item.reply.trim()) {
      doc.reply = item.reply.trim();
    }

    if (typeof item.title === 'string' && item.title.trim()) {
      doc.title = item.title.trim();
    }

    if (typeof item.target_slug === 'string' && item.target_slug.trim()) {
      doc.target_slug = item.target_slug.trim();
    }

    validDocs.push(doc);
  }

  // 4. Batch insert into database
  let createdDocs = [];
  if (validDocs.length > 0) {
    createdDocs = await Review.insertMany(validDocs, { ordered: false });
    // Invalidate public review cache so website immediately sees new reviews
    googleReviewsService.clearCache();
  }

  return {
    success: true,
    summary: {
      total: items.length,
      created: createdDocs.length,
      skipped: duplicates.length,
      failed: errors.length,
    },
    duplicates,
    errors,
  };
};

exports.normalizeString = normalizeString;
exports.getCompositeKey = getCompositeKey;
