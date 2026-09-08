const Review = require('../../models/Review');

exports.getProductReviews = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const reviews = await Review.find({
      type: 'product_review',
      target_slug: slug,
      approved: true,
    }).sort({ createdAt: -1 });

    const formatted = reviews.map((r) => ({
      id: r._id.toString(),
      productSlug: r.target_slug,
      name: r.name,
      rating: r.rating || 5,
      message: r.message,
      date: r.createdAt.toISOString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

exports.createProductReview = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, rating, message } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      return res.status(400).json({ success: false, message: 'Review message must be at least 5 characters' });
    }

    const review = await Review.create({
      type: 'product_review',
      target_slug: slug,
      name: name.trim(),
      rating: numRating,
      message: message.trim(),
      approved: true,
    });

    res.status(201).json({
      success: true,
      data: {
        id: review._id.toString(),
        productSlug: review.target_slug,
        name: review.name,
        rating: review.rating,
        message: review.message,
        date: review.createdAt.toISOString(),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getBlogComments = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const comments = await Review.find({
      type: 'blog_comment',
      target_slug: slug,
      approved: true,
    }).sort({ createdAt: -1 });

    const formatted = comments.map((c) => ({
      id: c._id.toString(),
      blogSlug: c.target_slug,
      name: c.name,
      email: c.email,
      comment: c.message,
      date: c.createdAt.toISOString(),
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    next(error);
  }
};

exports.createBlogComment = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { name, email, comment } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Comment must be at least 3 characters' });
    }

    const created = await Review.create({
      type: 'blog_comment',
      target_slug: slug,
      name: name.trim(),
      email: email ? email.trim() : undefined,
      message: comment.trim(),
      approved: true,
    });

    res.status(201).json({
      success: true,
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
