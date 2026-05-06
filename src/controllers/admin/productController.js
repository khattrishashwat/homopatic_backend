const Product = require('../../models/Product');
const fs = require('fs').promises;

exports.getAllProducts = async (req, res, next) => {
  try {
    const query = { active: true, in_stock: true };

    if (req.query.category) query.category = req.query.category;
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductBySlug = async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug });
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const productData = {
      name: req.body.name,
      slug: req.body.slug || req.body.name.toLowerCase().replace(/ /g, '-'),
      description: req.body.description,
      price: req.body.price,
      compare_price: req.body.compare_price,
      category: req.body.category,
      stock: req.body.stock || 0,
      sku: req.body.sku,
      in_stock: req.body.stock > 0,
      weight: req.body.weight,
      dimensions: req.body.dimensions,
      attributes: req.body.attributes,
      seo_title: req.body.seo_title,
      seo_description: req.body.seo_description,
      created_by: req.user._id,
    };

    // Handle image uploads
    if (req.files) {
      if (req.files.image) {
        productData.image = `/uploads/${req.files.image[0].filename}`;
        productData.image_path = req.files.image[0].path;
      }
      if (req.files.images) {
        productData.images = req.files.images.map((f) => `/uploads/${f.filename}`);
        productData.images_paths = req.files.images.map((f) => f.path);
      }
    }

    const product = await Product.create(productData);
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    // Handle image updates
    if (req.files) {
      if (req.files.image && product.image_path) {
        try {
          await fs.unlink(product.image_path);
        } catch (err) {
          console.error('Failed to delete old image:', err);
        }
      }

      if (req.files.image) {
        product.image = `/uploads/${req.files.image[0].filename}`;
        product.image_path = req.files.image[0].path;
      }

      if (req.files.images && product.images_paths?.length > 0) {
        for (const imagePath of product.images_paths) {
          try {
            await fs.unlink(imagePath);
          } catch (err) {
            console.error('Failed to delete old image:', err);
          }
        }
      }

      if (req.files.images) {
        product.images = req.files.images.map((f) => `/uploads/${f.filename}`);
        product.images_paths = req.files.images.map((f) => f.path);
      }
    }

    // Update fields
    Object.assign(product, req.body);
    product.updated_at = new Date();
    await product.save();

    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      const error = new Error('Product not found');
      error.statusCode = 404;
      throw error;
    }

    // Delete images from filesystem
    if (product.image_path) {
      try {
        await fs.unlink(product.image_path);
      } catch (err) {
        console.error('Failed to delete image:', err);
      }
    }

    if (product.images_paths?.length > 0) {
      for (const imagePath of product.images_paths) {
        try {
          await fs.unlink(imagePath);
        } catch (err) {
          console.error('Failed to delete image:', err);
        }
      }
    }

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAdminProducts = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { sku: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (req.query.category) query.category = req.query.category;
    if (req.query.in_stock !== undefined) query.in_stock = req.query.in_stock === 'true';

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const products = await Product.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .populate('created_by', 'name email');

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
