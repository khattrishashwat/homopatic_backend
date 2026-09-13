const faqService = require('../../services/faqService');

/**
 * Get all FAQs (with optional search, category, active filters, and pagination)
 */
exports.getAllFaqs = async (req, res, next) => {
  try {
    const result = await faqService.getAllFaqs(req.query);
    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get FAQ by ID
 */
exports.getFaqById = async (req, res, next) => {
  try {
    const faq = await faqService.getFaqById(req.params.id);
    res.status(200).json({
      success: true,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new FAQ
 */
exports.createFaq = async (req, res, next) => {
  try {
    const faq = await faqService.createFaq(req.body, req.user?._id);
    res.status(201).json({
      success: true,
      message: 'FAQ created successfully',
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update FAQ
 */
exports.updateFaq = async (req, res, next) => {
  try {
    const faq = await faqService.updateFaq(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'FAQ updated successfully',
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete FAQ
 */
exports.deleteFaq = async (req, res, next) => {
  try {
    const result = await faqService.deleteFaq(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle FAQ status
 */
exports.toggleFaqStatus = async (req, res, next) => {
  try {
    const faq = await faqService.toggleFaqStatus(req.params.id, req.body.active);
    res.status(200).json({
      success: true,
      message: `FAQ ${faq.active ? 'activated' : 'deactivated'} successfully`,
      data: faq,
    });
  } catch (error) {
    next(error);
  }
};
