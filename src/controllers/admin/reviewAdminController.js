const Review = require('../../models/Review');

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
      email,
      rating = 5,
      message,
      profileImage,
      relativeTime,
      order = 0,
      approved = true,
    } = req.body;

    if (!name || !message) {
      return res.status(400).json({ success: false, message: 'Name and message are required' });
    }

    const review = await Review.create({
      type,
      target_slug: target_slug || '',
      title: title || '',
      name: name.trim(),
      email: email ? email.trim() : undefined,
      rating: Number(rating) || 5,
      message: message.trim(),
      profileImage: profileImage || '',
      relativeTime: relativeTime || 'Recent review',
      order: Number(order) || 0,
      approved: approved === 'true' || approved === true,
    });

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
      'email',
      'rating',
      'message',
      'profileImage',
      'relativeTime',
      'order',
      'approved',
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'rating' || field === 'order') {
          review[field] = Number(req.body[field]);
        } else if (field === 'approved') {
          review[field] = req.body[field] === 'true' || req.body[field] === true;
        } else {
          review[field] = req.body[field];
        }
      }
    });

    await review.save();
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

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
};
