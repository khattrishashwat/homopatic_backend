const faqService = require('../../services/faqService');

/**
 * Get active FAQs for public website
 */
exports.getActiveFaqs = async (req, res, next) => {
  try {
    const faqs = await faqService.getActiveFaqs(req.query);
    res.status(200).json({
      success: true,
      count: faqs.length,
      data: faqs,
    });
  } catch (error) {
    next(error);
  }
};
