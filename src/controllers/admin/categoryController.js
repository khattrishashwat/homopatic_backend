const categoryService = require('../../services/categoryService');

/**
 * Get all categories (admin view with all fields)
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories(req.query);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active categories for frontend
 */
exports.getActiveCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getActiveCategories(req.query.type);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by slug
 */
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single category by ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new category
 */
exports.createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.createCategory(req.body, req.user._id);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Update category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(req.params.id, req.body, req.user._id);
    res.json({ success: true, data: category });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get category statistics
 */
exports.getCategoryStats = async (req, res, next) => {
  try {
    const stats = await categoryService.getCategoryStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
};
