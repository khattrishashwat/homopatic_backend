const productService = require('../../services/productService');
const Product = require('../../models/Product');
const s3Service = require('../../services/s3Service');
const excelService = require('../../services/excelService');
const path = require('path');

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
      gallery: req.body.gallery ? (typeof req.body.gallery === 'string' ? JSON.parse(req.body.gallery) : req.body.gallery) : [],
      attributes: req.body.attributes ? (typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes) : {},
      active: req.body.active === 'true' || req.body.active === true,
      featured: req.body.featured === 'true' || req.body.featured === true,
      recommended: req.body.recommended === 'true' || req.body.recommended === true,
    };

    // Handle primary image upload (S3 only)
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      const s3Res = await s3Service.uploadFile({
        buffer: file.buffer,
        module: 'products',
        category: 'images',
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      productData.image = s3Res.url;
      productData.image_s3_key = s3Res.key;
    }

    // Handle gallery uploads (S3 only)
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const newGalleryItems = [];
      let galleryAlts = {};
      if (req.body.gallery_alts) {
        try {
          galleryAlts = typeof req.body.gallery_alts === 'string' ? JSON.parse(req.body.gallery_alts) : req.body.gallery_alts;
        } catch (e) {
          galleryAlts = {};
        }
      }

      for (const file of req.files.gallery) {
        const s3Res = await s3Service.uploadFile({
          buffer: file.buffer,
          module: 'products',
          category: 'gallery',
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
        newGalleryItems.push({
          url: s3Res.url,
          alt: galleryAlts[file.originalname] || file.originalname,
          s3_key: s3Res.key,
        });
      }
      productData.gallery = [...(productData.gallery || []), ...newGalleryItems];
    }

    // Handle video upload if present (S3 only)
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      const s3Res = await s3Service.uploadFile({
        buffer: videoFile.buffer,
        module: 'products',
        category: 'videos',
        originalname: videoFile.originalname,
        mimetype: videoFile.mimetype,
      });
      productData.video_url = s3Res.url;
      productData.video_s3_key = s3Res.key;
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
    const existingProduct = await Product.findById(productId);
    if (!existingProduct) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const updates = {};

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

    if (updates.attributes !== undefined && typeof updates.attributes === 'string') {
      try {
        updates.attributes = JSON.parse(updates.attributes);
      } catch (e) {}
    }

    if (req.body.gallery) {
      try {
        updates.gallery = typeof req.body.gallery === 'string' ? JSON.parse(req.body.gallery) : req.body.gallery;
      } catch (e) {}
    }

    if (req.body.active !== undefined) {
      updates.active = req.body.active === 'true' || req.body.active === true;
    }
    if (req.body.featured !== undefined) {
      updates.featured = req.body.featured === 'true' || req.body.featured === true;
    }
    if (req.body.recommended !== undefined) {
      updates.recommended = req.body.recommended === 'true' || req.body.recommended === true;
    }

    // Handle image update & cleanup of obsolete S3 object (S3 only)
    if (req.files && req.files.image && req.files.image[0]) {
      const file = req.files.image[0];
      if (existingProduct.image_s3_key) {
        await s3Service.deleteFile(existingProduct.image_s3_key).catch(() => {});
      }
      const s3Res = await s3Service.uploadFile({
        buffer: file.buffer,
        module: 'products',
        recordId: productId,
        category: 'images',
        originalname: file.originalname,
        mimetype: file.mimetype,
      });
      updates.image = s3Res.url;
      updates.image_s3_key = s3Res.key;
    }

    // Handle gallery uploads (S3 only)
    if (req.files && req.files.gallery && req.files.gallery.length > 0) {
      const currentGallery = updates.gallery || existingProduct.gallery || [];
      let galleryAlts = {};
      if (req.body.gallery_alts) {
        try {
          galleryAlts = typeof req.body.gallery_alts === 'string' ? JSON.parse(req.body.gallery_alts) : req.body.gallery_alts;
        } catch (e) {
          galleryAlts = {};
        }
      }

      const newGalleryItems = [];
      for (const file of req.files.gallery) {
        const s3Res = await s3Service.uploadFile({
          buffer: file.buffer,
          module: 'products',
          recordId: productId,
          category: 'gallery',
          originalname: file.originalname,
          mimetype: file.mimetype,
        });
        newGalleryItems.push({
          url: s3Res.url,
          alt: galleryAlts[file.originalname] || file.originalname,
          s3_key: s3Res.key,
        });
      }
      updates.gallery = [...currentGallery, ...newGalleryItems];
    }

    // Handle video update (S3 only)
    if (req.files && req.files.video && req.files.video[0]) {
      const videoFile = req.files.video[0];
      if (existingProduct.video_s3_key) {
        await s3Service.deleteFile(existingProduct.video_s3_key).catch(() => {});
      }
      const s3Res = await s3Service.uploadFile({
        buffer: videoFile.buffer,
        module: 'products',
        recordId: productId,
        category: 'videos',
        originalname: videoFile.originalname,
        mimetype: videoFile.mimetype,
      });
      updates.video_url = s3Res.url;
      updates.video_s3_key = s3Res.key;
    }

    const product = await productService.updateProduct(productId, updates, req.user._id);
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (admin) - cleans up S3 assets
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Clean up S3 assets
    if (product.image_s3_key) {
      await s3Service.deleteFile(product.image_s3_key).catch(() => {});
    }
    if (product.video_s3_key) {
      await s3Service.deleteFile(product.video_s3_key).catch(() => {});
    }
    if (Array.isArray(product.gallery)) {
      for (const item of product.gallery) {
        if (item.s3_key) {
          await s3Service.deleteFile(item.s3_key).catch(() => {});
        }
      }
    }

    await productService.deleteProduct(req.params.id);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

/**
 * Export products to Excel
 */
exports.exportProductsExcel = async (req, res, next) => {
  try {
    const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
    const result = await excelService.exportProducts({ query: req.query, format });

    if (req.query.download === 'true') {
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.send(result.buffer);
    }

    res.json({
      success: true,
      message: 'Products exported successfully',
      data: {
        downloadUrl: result.downloadUrl,
        s3Key: result.key,
        filename: result.filename,
        count: result.count,
      },
    });
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
