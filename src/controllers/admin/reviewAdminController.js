const Review = require('../../models/Review');
const reviewService = require('../../services/reviewService');
const googleReviewsService = require('../../services/googleReviewsService');

/**
 * Get all reviews (admin) with filtering and pagination
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const {
      type,
      review_type,
      status,
      approved,
      product,
      target_slug,
      search,
      page = 1,
      limit = 50,
    } = req.query;

    const query = {};

    const targetType = type || review_type;
    if (targetType && targetType !== 'all') {
      query.type = targetType;
    }

    if (status && status !== 'all') {
      query.status = status;
    } else if (approved !== undefined && approved !== 'all') {
      const isApproved = approved === 'true' || approved === true;
      query.approved = isApproved;
    }

    const filterProduct = product || target_slug;
    if (filterProduct && filterProduct !== 'all') {
      query.target_slug = filterProduct;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } },
        { target_slug: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
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
      type,
      review_type = 'google_review',
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
      status,
      approved,
      googleReviewId,
      reviewDate,
      source = 'google',
      reply,
    } = req.body;

    const finalType = type || review_type || 'google_review';
    const finalName = (name || reviewer_name || '').trim();
    const finalMessage = (message || comment || '').trim();
    const finalEmail = (email || reviewer_email || '').trim();

    if (!finalName || !finalMessage) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }

    const finalApproved =
      status === 'approved' ||
      (status === undefined && (approved === undefined || approved === 'true' || approved === true));
    const finalStatus = status || (finalApproved ? 'approved' : 'rejected');

    const reviewData = {
      type: finalType,
      target_slug: target_slug || '',
      title: title || '',
      name: finalName,
      email: finalEmail || undefined,
      rating: Number(rating) || 5,
      message: finalMessage,
      profileImage: profileImage || '',
      relativeTime: relativeTime || 'Recent review',
      order: Number(order) || 0,
      status: finalStatus,
      approved: finalApproved,
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

    if (review.type === 'product_review' && review.target_slug) {
      await reviewService.recalculateProductRating(review.target_slug);
    }

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
      'review_type',
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
      'status',
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
        } else if (field === 'status') {
          review.status = req.body[field];
          review.approved = req.body[field] === 'approved';
        } else if (field === 'approved') {
          review.approved = req.body[field] === 'true' || req.body[field] === true;
          review.status = review.approved ? 'approved' : 'rejected';
        } else if (field === 'reviewer_name' || field === 'name') {
          review.name = req.body[field];
        } else if (field === 'comment' || field === 'message') {
          review.message = req.body[field];
        } else if (field === 'reviewer_email' || field === 'email') {
          review.email = req.body[field];
        } else if (field === 'review_type' || field === 'type') {
          review.type = req.body[field];
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

    if (review.type === 'product_review' && review.target_slug) {
      await reviewService.recalculateProductRating(review.target_slug);
    }

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

    if (review.type === 'product_review' && review.target_slug) {
      await reviewService.recalculateProductRating(review.target_slug);
    }

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
