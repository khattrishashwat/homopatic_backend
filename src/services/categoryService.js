const Category = require("../models/Category");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");


const generateUniqueSlug = async (name, excludeId = null) => {
  let baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };

    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingCategory = await Category.findOne(query);

    if (!existingCategory) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};


exports.getAllCategories = async (filters = {}) => {
  const query = {};

  // Filter by type
  if (filters.type && filters.type !== "all") {
    query.type = { $in: [filters.type, "both"] };
  }

  // Filter by active status
  if (filters.active !== undefined) {
    query.active = filters.active === "true";
  }

  // Search filter
  if (filters.search) {
    query.$or = [
      {
        name: {
          $regex: filters.search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: filters.search,
          $options: "i",
        },
      },
    ];
  }

  const categories = await Category.find(query)
    .sort({ createdAt: -1 })
    .select(
      "name slug description image image_alt active type createdAt updatedAt"
    );

  return categories;
};


exports.getActiveCategories = async (type = "both") => {
  const query = {
    active: true,
  };

  if (type && type !== "both") {
    query.type = {
      $in: [type, "both"],
    };
  }

  const categories = await Category.find(query)
    .sort({ name: 1 })
    .select("name slug description image image_alt");

  return categories;
};


exports.getCategoryBySlug = async (slug) => {
  const category = await Category.findOne({ slug });

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
};


exports.getCategoryById = async (id) => {
  const category = await Category.findById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
};


exports.createCategory = async (data) => {
  if (!data.name) {
    const error = new Error("Category name is required");
    error.statusCode = 400;
    throw error;
  }

  // Auto Generate Slug
  const slug = await generateUniqueSlug(data.name);

  const category = await Category.create({
    name: data.name,
    slug,
    description: data.description || "",
    image: data.image || "",
    image_alt: data.image_alt || "",
    active: data.active ?? true,
    type: data.type || "both",
  });

  return category;
};

/**
 * Update Category
 */
exports.updateCategory = async (id, data) => {
  const category = await Category.findById(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  // Auto Update Slug if Name Changes
  if (data.name && data.name !== category.name) {
    category.slug = await generateUniqueSlug(data.name, id);
  }

  // Update Fields
  category.name = data.name ?? category.name;
  category.description = data.description ?? category.description;
  category.image = data.image ?? category.image;
  category.image_alt = data.image_alt ?? category.image_alt;
  category.active = data.active ?? category.active;
  category.type = data.type ?? category.type;

  await category.save();

  return category;
};

/**
 * Delete Category
 */
exports.deleteCategory = async (id) => {
  const category = await Category.findByIdAndDelete(id);

  if (!category) {
    const error = new Error("Category not found");
    error.statusCode = 404;
    throw error;
  }

  return category;
};

/**
 * Category Stats
 */
exports.getCategoryStats = async () => {
  const stats = await Category.aggregate([
    {
      $group: {
        _id: "$type",
        total: {
          $sum: 1,
        },
        active: {
          $sum: {
            $cond: ["$active", 1, 0],
          },
        },
      },
    },
  ]);

  return stats;
};