const Faq = require('../models/Faq');

/**
 * Get all FAQs with filtering, search, and pagination
 */
exports.getAllFaqs = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ question: searchRegex }, { answer: searchRegex }, { category: searchRegex }];
  }

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category.trim();
  }

  if (filters.active !== undefined && filters.active !== 'all') {
    query.active = filters.active === true || filters.active === 'true';
  }

  const sort = { order: 1, createdAt: -1 };

  if (filters.page && filters.limit) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await Faq.countDocuments(query);
    const faqs = await Faq.find(query).sort(sort).skip(skip).limit(limit).lean();

    return {
      data: faqs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  const faqs = await Faq.find(query).sort(sort).lean();
  return { data: faqs };
};

/**
 * Get public active FAQs for website
 */
exports.getActiveFaqs = async (filters = {}) => {
  const query = { active: true };

  if (filters.category && filters.category !== 'all') {
    query.category = filters.category.trim();
  }

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [{ question: searchRegex }, { answer: searchRegex }];
  }

  const faqs = await Faq.find(query).sort({ order: 1, createdAt: -1 }).lean();
  return faqs;
};

/**
 * Get FAQ by ID
 */
exports.getFaqById = async (id) => {
  const faq = await Faq.findById(id);
  if (!faq) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }
  return faq;
};

/**
 * Create a new FAQ
 */
exports.createFaq = async (data, userId = null) => {
  if (!data.question || !data.question.trim()) {
    const error = new Error('Question is required');
    error.statusCode = 400;
    throw error;
  }

  if (!data.answer || !data.answer.trim()) {
    const error = new Error('Answer is required');
    error.statusCode = 400;
    throw error;
  }

  const faqData = {
    question: data.question.trim(),
    answer: data.answer.trim(),
    category: data.category?.trim() || 'General',
    order: Number.isInteger(Number(data.order)) ? Number(data.order) : 0,
    active: data.active !== undefined ? Boolean(data.active) : true,
  };

  if (userId) {
    faqData.created_by = userId;
  }

  const faq = new Faq(faqData);
  await faq.save();
  return faq;
};

/**
 * Update FAQ
 */
exports.updateFaq = async (id, data) => {
  const faq = await Faq.findById(id);
  if (!faq) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.question !== undefined) {
    if (!data.question.trim()) {
      const error = new Error('Question cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    faq.question = data.question.trim();
  }

  if (data.answer !== undefined) {
    if (!data.answer.trim()) {
      const error = new Error('Answer cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    faq.answer = data.answer.trim();
  }

  if (data.category !== undefined) {
    faq.category = data.category.trim() || 'General';
  }

  if (data.order !== undefined) {
    faq.order = Number.isInteger(Number(data.order)) ? Number(data.order) : 0;
  }

  if (data.active !== undefined) {
    faq.active = Boolean(data.active);
  }

  await faq.save();
  return faq;
};

/**
 * Delete FAQ
 */
exports.deleteFaq = async (id) => {
  const faq = await Faq.findByIdAndDelete(id);
  if (!faq) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }
  return { message: 'FAQ deleted successfully' };
};

/**
 * Toggle FAQ status
 */
exports.toggleFaqStatus = async (id, active) => {
  const faq = await Faq.findById(id);
  if (!faq) {
    const error = new Error('FAQ not found');
    error.statusCode = 404;
    throw error;
  }

  faq.active = active !== undefined ? Boolean(active) : !faq.active;
  await faq.save();
  return faq;
};
