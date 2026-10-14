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
    if (filters.type === "health_concern") {
      query.type = "health_concern";
    } else if (filters.type === "both") {
      query.type = "both";
    } else {
      query.type = { $in: [filters.type, "both"] };
    }
  }

  // Filter by status
  if (filters.status !== undefined && filters.status !== "all") {
    if (filters.status === "true" || filters.status === "active") {
      query.status = { $in: ["active", true] };
    } else if (filters.status === "false" || filters.status === "inactive") {
      query.status = { $in: ["inactive", false] };
    }
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
    .sort({ name: 1 })
    .select("name slug description status type");

  return categories.map((cat) => {
    const obj = cat.toObject ? cat.toObject() : cat;
    const isActive = obj.status === "active" || obj.status === true;
    return {
      ...obj,
      status: isActive ? "active" : "inactive",
      active: isActive,
    };
  });
};


exports.getActiveCategories = async (type = "both") => {
  const query = {
    status: { $in: ["active", true] },
  };

  if (type && type !== "all") {
    if (type === "health_concern") {
      query.type = "health_concern";
    } else if (type === "both") {
      query.type = { $in: ["product", "blog", "both"] };
    } else {
      query.type = {
        $in: [type, "both"],
      };
    }
  }

  const categories = await Category.find(query)
    .sort({ name: 1 })
    .select("name slug description status type");

  return categories.map((cat) => {
    const obj = cat.toObject ? cat.toObject() : cat;
    const isActive = obj.status === "active" || obj.status === true;
    return {
      ...obj,
      status: isActive ? "active" : "inactive",
      active: isActive,
    };
  });
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

  const status = data.status !== undefined
    ? (typeof data.status === "boolean" ? (data.status ? "active" : "inactive") : data.status)
    : (data.active !== undefined ? (data.active ? "active" : "inactive") : "active");

  const category = await Category.create({
    name: data.name,
    slug,
    description: data.description || "",
    status,
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
  if (data.status !== undefined) {
    category.status = typeof data.status === "boolean" ? (data.status ? "active" : "inactive") : data.status;
  } else if (data.active !== undefined) {
    category.status = data.active ? "active" : "inactive";
  }
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
        status: {
          $sum: {
            $cond: ["$status", 1, 0],
          },
        },
      },
    },
  ]);

  return stats;
};