const ChatbotQuestion = require('../models/ChatbotQuestion');

const parseKeywords = (keywords) => {
  if (Array.isArray(keywords)) {
    return keywords
      .map((k) => (typeof k === 'string' ? k.trim() : ''))
      .filter(Boolean);
  }
  if (typeof keywords === 'string') {
    return keywords
      .split(/[,;\n]/)
      .map((k) => k.trim())
      .filter(Boolean);
  }
  return [];
};

/**
 * Get all Chatbot Questions with filtering and search
 */
exports.getAllQuestions = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    const searchRegex = new RegExp(filters.search.trim(), 'i');
    query.$or = [
      { question: searchRegex },
      { answer: searchRegex },
      { keywords: searchRegex },
    ];
  }

  if (filters.active !== undefined && filters.active !== 'all') {
    query.active = filters.active === true || filters.active === 'true';
  }

  const sort = { order: 1, createdAt: -1 };

  if (filters.page && filters.limit) {
    const page = parseInt(filters.page, 10) || 1;
    const limit = parseInt(filters.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const total = await ChatbotQuestion.countDocuments(query);
    const questions = await ChatbotQuestion.find(query).sort(sort).skip(skip).limit(limit).lean();

    return {
      data: questions,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  const questions = await ChatbotQuestion.find(query).sort(sort).lean();
  return { data: questions };
};

/**
 * Get active chatbot questions for matching engine
 */
exports.getActiveQuestions = async () => {
  return ChatbotQuestion.find({ active: true }).sort({ order: 1, createdAt: -1 }).lean();
};

/**
 * Get question by ID
 */
exports.getQuestionById = async (id) => {
  const question = await ChatbotQuestion.findById(id);
  if (!question) {
    const error = new Error('Chatbot Question not found');
    error.statusCode = 404;
    throw error;
  }
  return question;
};

/**
 * Create a new Chatbot Question
 */
exports.createQuestion = async (data, userId = null) => {
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

  const questionData = {
    question: data.question.trim(),
    answer: data.answer.trim(),
    keywords: parseKeywords(data.keywords),
    order: Number.isInteger(Number(data.order)) ? Number(data.order) : 0,
    active: data.active !== undefined ? Boolean(data.active) : true,
  };

  if (userId) {
    questionData.created_by = userId;
  }

  const record = new ChatbotQuestion(questionData);
  await record.save();
  return record;
};

/**
 * Update Chatbot Question
 */
exports.updateQuestion = async (id, data) => {
  const question = await ChatbotQuestion.findById(id);
  if (!question) {
    const error = new Error('Chatbot Question not found');
    error.statusCode = 404;
    throw error;
  }

  if (data.question !== undefined) {
    if (!data.question.trim()) {
      const error = new Error('Question cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    question.question = data.question.trim();
  }

  if (data.answer !== undefined) {
    if (!data.answer.trim()) {
      const error = new Error('Answer cannot be empty');
      error.statusCode = 400;
      throw error;
    }
    question.answer = data.answer.trim();
  }

  if (data.keywords !== undefined) {
    question.keywords = parseKeywords(data.keywords);
  }

  if (data.order !== undefined) {
    question.order = Number.isInteger(Number(data.order)) ? Number(data.order) : 0;
  }

  if (data.active !== undefined) {
    question.active = Boolean(data.active);
  }

  await question.save();
  return question;
};

/**
 * Delete Chatbot Question
 */
exports.deleteQuestion = async (id) => {
  const question = await ChatbotQuestion.findByIdAndDelete(id);
  if (!question) {
    const error = new Error('Chatbot Question not found');
    error.statusCode = 404;
    throw error;
  }
  return { message: 'Chatbot Question deleted successfully' };
};

/**
 * Toggle active status
 */
exports.toggleQuestionStatus = async (id, active) => {
  const question = await ChatbotQuestion.findById(id);
  if (!question) {
    const error = new Error('Chatbot Question not found');
    error.statusCode = 404;
    throw error;
  }

  question.active = active !== undefined ? Boolean(active) : !question.active;
  await question.save();
  return question;
};

/**
 * Normalize question for duplicate detection (lowercase, remove punctuation, collapse whitespace)
 */
const normalizeQuestion = (q) => {
  if (!q || typeof q !== 'string') return '';
  return q
    .toLowerCase()
    .trim()
    .replace(/[?!.,;:'"()[\]{}]/g, '')
    .replace(/\s+/g, ' ');
};

/**
 * Bulk upload Chatbot Questions with normalized duplicate detection
 */
exports.bulkUploadQuestions = async (items, userId = null) => {
  if (!Array.isArray(items)) {
    const error = new Error('Invalid payload: expected an array of questions or { questions: [...] }');
    error.statusCode = 400;
    throw error;
  }

  const errors = [];
  const duplicates = [];
  const validDocs = [];
  const seenInBatchSet = new Set();

  // 1. Fetch existing questions once to avoid queries in loops
  const existingQuestions = await ChatbotQuestion.find().select('question').lean();
  const existingNormSet = new Set(existingQuestions.map((q) => normalizeQuestion(q.question)));

  // 2. Validate and identify duplicates for each item
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!item || typeof item !== 'object') {
      errors.push({
        index: i,
        error: 'Record must be a valid object',
      });
      continue;
    }

    const questionRaw = typeof item.question === 'string' ? item.question.trim() : '';
    const answerRaw = typeof item.answer === 'string' ? item.answer.trim() : '';

    if (!questionRaw) {
      errors.push({
        index: i,
        question: item.question || null,
        error: 'Question is required and cannot be empty',
      });
      continue;
    }

    if (!answerRaw) {
      errors.push({
        index: i,
        question: questionRaw,
        error: 'Answer is required and cannot be empty',
      });
      continue;
    }

    const normQ = normalizeQuestion(questionRaw);

    if (existingNormSet.has(normQ)) {
      duplicates.push({
        index: i,
        question: questionRaw,
        reason: 'Question already exists in database',
      });
      continue;
    }

    if (seenInBatchSet.has(normQ)) {
      duplicates.push({
        index: i,
        question: questionRaw,
        reason: 'Duplicate question within upload batch',
      });
      continue;
    }

    seenInBatchSet.add(normQ);

    const doc = {
      question: questionRaw,
      answer: answerRaw,
      category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
      keywords: parseKeywords(item.keywords),
      order: Number.isInteger(Number(item.order)) ? Number(item.order) : 0,
      active: item.active !== undefined ? Boolean(item.active) : true,
    };

    if (userId) {
      doc.created_by = userId;
    }

    validDocs.push(doc);
  }

  // 3. Perform bulk insert
  let createdDocs = [];
  if (validDocs.length > 0) {
    createdDocs = await ChatbotQuestion.insertMany(validDocs, { ordered: false });
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

exports.normalizeQuestion = normalizeQuestion;

