const googleReviewsService = require('../../services/googleReviewsService');

exports.getGoogleReviews = async (req, res, next) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const reviews = await googleReviewsService.getGoogleReviews({ forceRefresh });
    res.json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};
