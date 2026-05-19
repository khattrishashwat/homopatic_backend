const productService = require('../../services/productService');
const Product = require('../../models/Product');
const fs = require('fs').promises;

/**
 * Get all products (public API)
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const result = await productService.getAllProducts(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Get product by slug (public API)
 */
exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await productService.getProductBySlug(req.params.slug);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured products (public API)
 */
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;
    const products = await productService.getFeaturedProducts(limit);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};

/**
 * Create product (admin)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const productData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      compare_price: req.body.compare_price,
      category: req.body.category,
      stock: req.body.stock,
      sku: req.body.sku,
      image_alt: req.body.image_alt,
      gallery: req.body.gallery ? JSON.parse(req.body.gallery) : [],
      attributes: req.body.attributes ? JSON.parse(req.body.attributes) : {},
      active: req.body.active === 'true' || req.body.active === true,
      featured: req.body.featured === 'true' || req.body.featured === true,
    };

    // Handle image upload
    if (req.files && req.files.image) {
      productData.image = `/uploads/${req.files.image[0].filename}`;
    }

    // Handle gallery uploads
    if (req.files && req.files.gallery) {
      productData.gallery = req.files.gallery.map((file) => ({
        url: `/uploads/${file.filename}`,
alt: req.body.gallery_alts
  ? JSON.parse(req.body.gallery_alts || '{}')[file.filename] || ''
  : '',
      }));
    }

    const product = await productService.createProduct(productData, req.user._id);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (admin)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const productId = req.params.id;
    const updates = {};

    // Collect updates from body
    const fields = [
      'name', 'slug', 'description',
      'price', 'compare_price', 'category', 'stock', 'sku',
      'image_alt', 'attributes'
    ];

    // Handle gallery
    if (req.body.gallery) {
      updates.gallery = JSON.parse(String(req.body.gallery));
    }

    // Handle booleans
    if (req.body.active !== undefined) {
      updates.active = req.body.active === 'true' || req.body.active === true;
    }
    if (req.body.featured !== undefined) {
      updates.featured = req.body.featured === 'true' || req.body.featured === true;
    }

    // Handle image upload
    if (req.files && req.files.image) {
      updates.image = `/uploads/${req.files.image[0].filename}`;
    }

    // Handle gallery uploads
    if (req.files && req.files.gallery) {
      const existingGallery = updates.gallery || (await Product.findById(productId))?.gallery || [];
      const newGalleryItems = req.files.gallery.map((file) => ({
        url: `/uploads/${file.filename}`,
        alt: req.body.gallery_alts ? JSON.parse(String(req.body.gallery_alts || '{}'))[file.filename] || '' : '',
      }));
      updates.gallery = [...existingGallery, ...newGalleryItems];
    }

    const product = await productService.updateProduct(productId, updates, req.user._id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (admin)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin products list
 */
exports.getAdminProducts = async (req, res, next) => {
  try {
    const result = await productService.getAdminProducts(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product featured status
 */
exports.toggleFeatured = async (req, res, next) => {
  try {
    const product = await productService.toggleFeatured(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Search products
 */
exports.searchProducts = async (req, res, next) => {
  try {
    const query = req.query.q;
    const limit = parseInt(req.query.limit) || 10;
    const products = await productService.searchProducts(query, limit);
    res.json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
};
