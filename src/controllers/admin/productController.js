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
 * Get product by ID (admin)
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
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
      whyWeChooseThis: req.body.whyWeChooseThis !== undefined ? req.body.whyWeChooseThis : req.body.why_we_choose_this,
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
      recommended: req.body.recommended === 'true' || req.body.recommended === true,
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
      'name', 'slug', 'description', 'whyWeChooseThis',
      'price', 'compare_price', 'category', 'stock', 'sku',
      'image_alt', 'attributes'
    ];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (req.body.why_we_choose_this !== undefined && updates.whyWeChooseThis === undefined) {
      updates.whyWeChooseThis = req.body.why_we_choose_this;
    }

    // Number conversions and cleanups
    if (updates.price !== undefined && updates.price !== '') {
      updates.price = Number(updates.price);
    }
    if (updates.compare_price !== undefined) {
      updates.compare_price =
        updates.compare_price === '' || updates.compare_price === null || updates.compare_price === 'null'
          ? null
          : Number(updates.compare_price);
    }
    if (updates.stock !== undefined && updates.stock !== '') {
      updates.stock = Number(updates.stock);
    }
    if (updates.category !== undefined) {
      updates.category =
        updates.category === '' || updates.category === 'null' || updates.category === 'undefined'
          ? null
          : updates.category;
    }
    if (updates.sku !== undefined) {
      updates.sku =
        updates.sku === '' || updates.sku === null || String(updates.sku).trim() === ''
          ? null
          : String(updates.sku).trim();
    }

    // Attributes parsing
    if (updates.attributes !== undefined && typeof updates.attributes === 'string') {
      try {
        updates.attributes = JSON.parse(updates.attributes);
      } catch (e) {
        // keep as is
      }
    }

    // Handle gallery
    if (req.body.gallery) {
      try {
        updates.gallery = typeof req.body.gallery === 'string' ? JSON.parse(req.body.gallery) : req.body.gallery;
      } catch (e) {
        // ignore
      }
    }

    // Handle booleans
    if (req.body.active !== undefined) {
      updates.active = req.body.active === 'true' || req.body.active === true;
    }
    if (req.body.featured !== undefined) {
      updates.featured = req.body.featured === 'true' || req.body.featured === true;
    }
    if (req.body.recommended !== undefined) {
      updates.recommended = req.body.recommended === 'true' || req.body.recommended === true;
    }

    // Handle image upload
    if (req.files && req.files.image) {
      updates.image = `/uploads/${req.files.image[0].filename}`;
    }

    // Handle gallery uploads
    if (req.files && req.files.gallery) {
      const existingGallery = updates.gallery || (await Product.findById(productId))?.gallery || [];
      let galleryAlts = {};
      if (req.body.gallery_alts) {
        try {
          galleryAlts = typeof req.body.gallery_alts === 'string' ? JSON.parse(req.body.gallery_alts) : req.body.gallery_alts;
        } catch (e) {
          galleryAlts = {};
        }
      }
      const newGalleryItems = req.files.gallery.map((file) => ({
        url: `/uploads/${file.filename}`,
        alt: galleryAlts[file.filename] || '',
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
    console.log('Admin products result:', result);
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
