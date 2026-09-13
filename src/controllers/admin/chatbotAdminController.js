const chatbotQuestionService = require('../../services/chatbotQuestionService');

/**
 * Get all Chatbot Questions (with search, active status filter, pagination)
 */
exports.getAllQuestions = async (req, res, next) => {
  try {
    const result = await chatbotQuestionService.getAllQuestions(req.query);
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
 * Get Chatbot Question by ID
 */
exports.getQuestionById = async (req, res, next) => {
  try {
    const question = await chatbotQuestionService.getQuestionById(req.params.id);
    res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new Chatbot Question
 */
exports.createQuestion = async (req, res, next) => {
  try {
    const question = await chatbotQuestionService.createQuestion(req.body, req.user?._id);
    res.status(201).json({
      success: true,
      message: 'Chatbot Question created successfully',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Chatbot Question
 */
exports.updateQuestion = async (req, res, next) => {
  try {
    const question = await chatbotQuestionService.updateQuestion(req.params.id, req.body);
    res.status(200).json({
      success: true,
      message: 'Chatbot Question updated successfully',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Chatbot Question
 */
exports.deleteQuestion = async (req, res, next) => {
  try {
    const result = await chatbotQuestionService.deleteQuestion(req.params.id);
    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Chatbot Question status
 */
exports.toggleQuestionStatus = async (req, res, next) => {
  try {
    const question = await chatbotQuestionService.toggleQuestionStatus(req.params.id, req.body.active);
    res.status(200).json({
      success: true,
      message: `Chatbot Question ${question.active ? 'activated' : 'deactivated'} successfully`,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk upload Chatbot Questions (admin)
 */
exports.bulkUploadQuestions = async (req, res, next) => {
  try {
    const questions = Array.isArray(req.body) ? req.body : req.body?.questions;

    if (!Array.isArray(questions)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: expected an array of questions or { questions: [...] }',
      });
    }

    const result = await chatbotQuestionService.bulkUploadQuestions(questions, req.user?._id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

