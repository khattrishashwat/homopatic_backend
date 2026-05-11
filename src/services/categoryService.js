const Category = require("../models/Category");

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Get all categories with optional filters
 */
exports.getAllCategories = async (filters = {}) => {
  const query = {};

  if (filters.type && filters.type !== 'all') {
    query.type = { $in: [filters.type, 'both'] };
  }

  if (filters.active !== undefined) {
    query.active = filters.active === 'true';
  }

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const categories = await Category.find(query)
    .sort({ name: 1 })
    .select('name slug description image image_alt seo_title seo_description active type');

  return categories;
};

/**
 * Get active categories for frontend display
 */
exports.getActiveCategories = async (type = 'both') => {
  const query = { active: true };
  if (type && type !== 'both') {
    query.type = { $in: [type, 'both'] };
  }

  const categories = await Category.find(query)
    .sort({ name: 1 })
    .select('name slug description image image_alt');

  return categories;
};

/**
 * Get single category by slug
 */
exports.getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug });
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

/**
 * Get single category by ID
 */
exports.getCategoryById = async (id) => {
  const category = await Category.findById(id);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

/**
 * Create a new category
 */
exports.createCategory = async (data, userId) => {
  // Generate slug from name if not provided
  const categorySlug = data.slug || slugify(data.name);

  // Check if slug already exists
  const existingCategory = await Category.findOne({ slug: categorySlug });
  if (existingCategory) {
    const error = new Error('Category with this name already exists');
    error.statusCode = 400;
    throw error;
  }

  const category = await Category.create({
    name: data.name,
    slug: categorySlug,
    description: data.description,
    image: data.image,
    image_alt: data.image_alt,
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    seo_keywords: data.seo_keywords || [],
    canonical_url: data.canonical_url,
    active: data.active !== undefined ? data.active : true,
    type: data.type || 'both',
  });

  return category;
};

/**
 * Update category
 */
exports.updateCategory = async (id, data, userId) => {
  const category = await Category.findById(id);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }

  // If name changed, update slug
  if (data.name && data.name !== category.name) {
    const newSlug = slugify(data.name);
    const existingCategory = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existingCategory) {
      const error = new Error('Category with this name already exists');
      error.statusCode = 400;
      throw error;
    }
    category.slug = newSlug;
  }

  // Update fields
  const updateFields = [
    'name', 'description', 'image', 'image_alt',
    'seo_title', 'seo_description', 'seo_keywords',
    'canonical_url', 'active', 'type'
  ];

  updateFields.forEach(field => {
    if (data[field] !== undefined) {
      category[field] = data[field];
    }
  });

  category.updatedAt = new Date();
  await category.save();

  return category;
};

/**
 * Delete category
 */
exports.deleteCategory = async (id) => {
  const category = await Category.findByIdAndDelete(id);
  if (!category) {
    const error = new Error('Category not found');
    error.statusCode = 404;
    throw error;
  }
  return category;
};

/**
 * Get category statistics
 */
exports.getCategoryStats = async () => {
  const stats = await Category.aggregate([
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        active: {
          $sum: { $cond: ['$active', 1, 0] }
        }
      }
    }
  ]);

  return stats;
};
