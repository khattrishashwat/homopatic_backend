// controllers/admin/categoryController.js

const categoryService = require("../../services/categoryService");

/**
 * Get All Categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAllCategories(req.query);

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Active Categories
 */
exports.getActiveCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getActiveCategories(
      req.query.type
    );

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Category By Slug
 */
exports.getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryBySlug(req.params.slug);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Category By ID
 */
exports.getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getCategoryById(req.params.id);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Category
 */
exports.createCategory = async (req, res, next) => {
  console.log('Request body:', req.body);
  try {
    const category = await categoryService.createCategory(req.body);
console.log('Category created:', category);
    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Category
 */
exports.updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.updateCategory(
      req.params.id,
      req.body
    );

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Category
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    await categoryService.deleteCategory(req.params.id);

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Category Statistics
 */
exports.getCategoryStats = async (req, res, next) => {
  try {
    const stats = await categoryService.getCategoryStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};