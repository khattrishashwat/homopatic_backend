const Product = require('../models/Product');
const fs = require("fs").promises;
const path = require("path");

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Get all products with filters (public API)
 */
exports.getAllProducts = async (filters = {}) => {
  const query = { active: true };

  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.search) {
    query.$text = { $search: filters.search };
  }
  if (filters.featured) {
    query.featured = true;
  }
  if (filters.in_stock !== undefined) {
    query.in_stock = filters.in_stock === 'true';
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 12;
  const skip = (page - 1) * limit;
  const sort = filters.sort || { created_at: -1 };

  const products = await Product.find(query)
    .sort(sort)
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .select('-created_by -updated_at');

  const total = await Product.countDocuments(query);

  return {
    data: products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get single product by slug
 */
exports.getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, active: true })
    .populate('category', 'name slug seo_title seo_description');

  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Increment views
  product.views = (product.views || 0) + 1;
  await product.save();

  return product;
};

/**
 * Get featured products
 */
exports.getFeaturedProducts = async (limit = 6) => {
  const products = await Product.find({ active: true, featured: true })
    .sort({ created_at: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .select('name slug price compare_price image featured_image_alt category');

  return products;
};

/**
 * Get related products by category
 */
exports.getRelatedProducts = async (productId, limit = 4) => {
  const product = await Product.findById(productId);
  if (!product) return [];

  const products = await Product.find({
    _id: { $ne: productId },
    category: product.category,
    active: true,
  })
    .sort({ created_at: -1 })
    .limit(limit)
    .select('name slug price compare_price image featured_image_alt');

  return products;
};

/**
 * Create new product (admin)
 */
exports.createProduct = async (data, userId) => {
  // Generate slug if not provided
  let productSlug = data.slug;
  if (!productSlug) {
    productSlug = slugify(data.name);
  }

  // Check slug uniqueness
  const existing = await Product.findOne({ slug: productSlug });
  if (existing) {
    const error = new Error('Product with this name already exists');
    error.statusCode = 400;
    throw error;
  }

  // Prepare product data
  const productData = {
    name: data.name,
    slug: productSlug,
    short_description: data.short_description,
    description: data.description,
    price: data.price,
    compare_price: data.compare_price,
    category: data.category || null,
    stock: data.stock || 0,
    sku: data.sku || null,
    image: data.image,
    image_alt: data.image_alt,
    gallery: data.gallery || [],
    attributes: data.attributes || {},
    seo_title: data.seo_title,
    seo_description: data.seo_description,
    seo_keywords: data.seo_keywords || [],
    canonical_url: data.canonical_url,
    og_image: data.og_image || data.image,
    active: data.active !== undefined ? data.active : true,
    featured: data.featured || false,
    created_by: userId,
  };

  const product = await Product.create(productData);
  return product;
};

/**
 * Update product (admin)
 */
exports.updateProduct = async (id, data, userId) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  // Update slug if name changed
  if (data.name && data.name !== product.name) {
    const newSlug = slugify(data.name);
    const existing = await Product.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existing) {
      const error = new Error('Product with this name already exists');
      error.statusCode = 400;
      throw error;
    }
    product.slug = newSlug;
  }

  // Update allowed fields
  const updateFields = [
    'name', 'short_description', 'description', 'price', 'compare_price',
    'category', 'stock', 'sku', 'image', 'image_alt', 'gallery',
    'attributes', 'seo_title', 'seo_description', 'seo_keywords',
    'canonical_url', 'og_image', 'active', 'featured'
  ];

  updateFields.forEach(field => {
    if (data[field] !== undefined) {
      product[field] = data[field];
    }
  });

  // Update stock status
  product.in_stock = product.stock > 0;

  product.updatedAt = new Date();
  await product.save();

  return product;
};

/**
 * Delete product (admin)
 */
exports.deleteProduct = async (id) => {
  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }
  return product;
};

/**
 * Get all products for admin (with all fields)
 */
exports.getAdminProducts = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { sku: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.category) query.category = filters.category;
  if (filters.active !== undefined) query.active = filters.active === 'true';
  if (filters.featured !== undefined) query.featured = filters.featured === 'true';
  if (filters.in_stock !== undefined) query.in_stock = filters.in_stock === 'true';

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .populate('created_by', 'name email');

  const total = await Product.countDocuments(query);

  return {
    data: products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Search products (autocomplete, etc.)
 */
exports.searchProducts = async (query, limit = 10) => {
  const products = await Product.find(
    { active: true, $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .select('name slug price image category');

  return products;
};

/**
 * Get products by category
 */
exports.getProductsByCategory = async (categoryId, filters = {}) => {
  const query = { category: categoryId, active: true };

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 12;
  const skip = (page - 1) * limit;

  const products = await Product.find(query)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Product.countDocuments(query);

  return {
    data: products,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update product stock
 */
exports.updateProductStock = async (id, quantity) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  product.stock = quantity;
  product.in_stock = quantity > 0;
  await product.save();

  return product;
};

/**
 * Toggle product featured status
 */
exports.toggleFeatured = async (id) => {
  const product = await Product.findById(id);
  if (!product) {
    const error = new Error('Product not found');
    error.statusCode = 404;
    throw error;
  }

  product.featured = !product.featured;
  await product.save();

  return product;
};
