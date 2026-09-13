const Review = require('../../models/Review');
const reviewService = require('../../services/reviewService');
const googleReviewsService = require('../../services/googleReviewsService');

/**
 * Get all reviews (admin) with filtering and pagination
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const { type, approved, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (type) {
      query.type = type;
    }
    if (approved !== undefined) {
      query.approved = approved === 'true' || approved === true;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { target_slug: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const skip = (pageNum - 1) * limitNum;

    const [reviews, total] = await Promise.all([
      Review.find(query).sort({ order: 1, createdAt: -1 }).skip(skip).limit(limitNum),
      Review.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reviews,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new review/testimonial (admin)
 */
exports.createReview = async (req, res, next) => {
  try {
    const {
      type = 'google_review',
      target_slug,
      title,
      name,
      reviewer_name,
      email,
      reviewer_email,
      rating = 5,
      message,
      comment,
      profileImage,
      relativeTime,
      order = 0,
      approved = true,
      googleReviewId,
      reviewDate,
      source = 'google',
      reply,
    } = req.body;

    const finalName = (name || reviewer_name || '').trim();
    const finalMessage = (message || comment || '').trim();
    const finalEmail = (email || reviewer_email || '').trim();

    if (!finalName || !finalMessage) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }

    const reviewData = {
      type,
      target_slug: target_slug || '',
      title: title || '',
      name: finalName,
      email: finalEmail || undefined,
      rating: Number(rating) || 5,
      message: finalMessage,
      profileImage: profileImage || '',
      relativeTime: relativeTime || 'Recent review',
      order: Number(order) || 0,
      approved: approved === 'true' || approved === true,
      source,
    };

    if (googleReviewId) reviewData.googleReviewId = googleReviewId.trim();
    if (reviewDate) {
      const parsed = new Date(reviewDate);
      if (!isNaN(parsed.getTime())) {
        reviewData.reviewDate = parsed;
        reviewData.createdAt = parsed;
      }
    }
    if (reply) reviewData.reply = reply.trim();

    const review = await Review.create(reviewData);

    googleReviewsService.clearCache();

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing review (admin)
 */
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const allowed = [
      'type',
      'target_slug',
      'title',
      'name',
      'reviewer_name',
      'email',
      'reviewer_email',
      'rating',
      'message',
      'comment',
      'profileImage',
      'relativeTime',
      'order',
      'approved',
      'googleReviewId',
      'reviewDate',
      'source',
      'reply',
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'rating' || field === 'order') {
          review[field] = Number(req.body[field]);
        } else if (field === 'approved') {
          review[field] = req.body[field] === 'true' || req.body[field] === true;
        } else if (field === 'reviewer_name') {
          review.name = req.body[field];
        } else if (field === 'comment') {
          review.message = req.body[field];
        } else if (field === 'reviewer_email') {
          review.email = req.body[field];
        } else if (field === 'reviewDate') {
          const parsed = new Date(req.body[field]);
          if (!isNaN(parsed.getTime())) {
            review.reviewDate = parsed;
          }
        } else {
          review[field] = req.body[field];
        }
      }
    });

    await review.save();
    googleReviewsService.clearCache();

    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a review (admin)
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const review = await Review.findByIdAndDelete(id);

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    googleReviewsService.clearCache();

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk upload Google Reviews (admin)
 */
exports.bulkUploadReviews = async (req, res, next) => {
  try {
    const reviews = Array.isArray(req.body) ? req.body : req.body?.reviews;

    if (!Array.isArray(reviews)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: expected an array of reviews or { reviews: [...] }',
      });
    }

    const result = await reviewService.bulkUploadReviews(reviews);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

