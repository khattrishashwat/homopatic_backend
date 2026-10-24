const Review = require('../../models/Review');
const Product = require('../../models/Product');
const Order = require('../../models/Order');
const { recalculateProductRating } = require('../../services/reviewService');

/**
 * Get all approved customer reviews for a product
 */
exports.getProductReviews = async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Only approved reviews should be publicly visible
    const reviews = await Review.find({
      type: 'product_review',
      target_slug: slug,
      $or: [{ status: 'approved' }, { approved: true, status: { $ne: 'rejected' } }],
    }).sort({ createdAt: -1 });

    const total = reviews.length;
    const average =
      total === 0
        ? 0
        : Number((reviews.reduce((sum, r) => sum + (Number(r.rating) || 5), 0) / total).toFixed(1));

    // Keep product summary in sync
    Product.updateOne(
      { slug },
      { average_rating: average, total_reviews: total }
    ).catch((err) => {
      console.error('Failed to sync product rating in background:', err.message);
    });

    const formatted = reviews.map((r) => ({
      id: r._id.toString(),
      productSlug: r.target_slug,
      name: r.name,
      rating: r.rating || 5,
      message: r.message,
      verifiedPurchase: Boolean(r.verified_purchase),
      date: (r.reviewDate || r.createdAt).toISOString(),
    }));

    res.json({
      success: true,
      data: formatted,
      summary: {
        total,
        average,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a customer review for a product (defaults to pending moderation)
 */
exports.createProductReview = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, rating, message } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';
    const numRating = Number(rating);

    // 1. Validation
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be between 2 and 100 characters',
      });
    }

    if (!Number.isInteger(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (!trimmedMessage || trimmedMessage.length < 5 || trimmedMessage.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Review message must be between 5 and 2000 characters',
      });
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    // Check if product exists
    const product = await Product.findOne({ slug });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // 2. Prevent duplicate / abusive submissions
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const duplicateConditions = [
      // Exact same message for the same product
      { type: 'product_review', target_slug: slug, message: trimmedMessage },
    ];

    if (trimmedEmail) {
      // Same email within 10 minutes
      duplicateConditions.push({
        type: 'product_review',
        target_slug: slug,
        email: trimmedEmail,
        createdAt: { $gte: tenMinutesAgo },
      });
    } else {
      // Same name within 10 minutes
      duplicateConditions.push({
        type: 'product_review',
        target_slug: slug,
        name: trimmedName,
        createdAt: { $gte: tenMinutesAgo },
      });
    }

    const existingReview = await Review.findOne({ $or: duplicateConditions });
    if (existingReview) {
      return res.status(429).json({
        success: false,
        message:
          'You have already submitted a similar review recently. Please allow our team time to moderate it.',
      });
    }

    // 3. Check for authenticated user & verified purchase
    let userId = undefined;
    let isVerifiedPurchase = false;

    if (req.user) {
      userId = req.user._id;
      // Check if user has an order containing this product
      try {
        const orderExists = await Order.exists({
          user: req.user._id,
          'items.product': product._id,
          $or: [{ payment_status: 'paid' }, { status: { $in: ['delivered', 'completed'] } }],
        });
        if (orderExists) {
          isVerifiedPurchase = true;
        }
      } catch (orderErr) {
        // Continue even if order check has an error
      }
    }

    // 4. Save review with status 'pending' (requires admin approval)
    const review = await Review.create({
      type: 'product_review',
      target_slug: slug,
      name: trimmedName,
      email: trimmedEmail || undefined,
      rating: numRating,
      message: trimmedMessage,
      status: 'pending',
      approved: false,
      user: userId,
      verified_purchase: isVerifiedPurchase,
      ip: clientIp,
      reviewDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message:
        'Thank you! Your review has been submitted and will be published once approved by our moderation team.',
      data: {
        id: review._id.toString(),
        productSlug: review.target_slug,
        name: review.name,
        rating: review.rating,
        message: review.message,
        status: review.status,
        date: review.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get approved comments for a blog post
 */
exports.getBlogComments = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const comments = await Review.find({
      type: 'blog_comment',
      target_slug: slug,
      $or: [{ status: 'approved' }, { approved: true, status: { $ne: 'rejected' } }],
    }).sort({ createdAt: -1 });

    const formatted = comments.map((c) => ({
      id: c._id.toString(),
      blogSlug: c.target_slug,
      name: c.name,
      email: c.email,
      comment: c.message,
      date: (c.reviewDate || c.createdAt).toISOString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit a blog comment (pending moderation)
 */
exports.createBlogComment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, comment } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    const trimmedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const trimmedComment = typeof comment === 'string' ? comment.trim() : '';

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name is required and must be between 2 and 100 characters',
      });
    }

    if (!trimmedComment || trimmedComment.length < 3 || trimmedComment.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be between 3 and 2000 characters',
      });
    }

    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address',
      });
    }

    const created = await Review.create({
      type: 'blog_comment',
      target_slug: slug,
      name: trimmedName,
      email: trimmedEmail || undefined,
      message: trimmedComment,
      status: 'pending',
      approved: false,
      user: req.user?._id,
      reviewDate: new Date(),
    });

    res.status(201).json({
      success: true,
      message: 'Thank you! Your comment has been submitted and is pending moderation.',
      data: {
        id: created._id.toString(),
        blogSlug: created.target_slug,
        name: created.name,
        email: created.email,
        comment: created.message,
        date: created.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};
