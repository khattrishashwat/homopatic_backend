const blogService = require('../../services/blogService');
const multer = require('../../utils/multer');

/**
 * Get all published blogs (public API)
 */
exports.getAllBlogs = async (req, res, next) => {
  try {
    const result = await blogService.getAllBlogs(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Get featured blogs
 */
exports.getFeaturedBlogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 3;
    const blogs = await blogService.getFeaturedBlogs(limit);
    res.json({ success: true, data: blogs });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog by slug (public API)
 */
exports.getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await blogService.getBlogBySlug(req.params.slug);
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

/**
 * Get blog by ID (admin)
 */
exports.getBlogById = async (req, res, next) => {
  try {
    const blog = await blogService.getBlogById(req.params.id);
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin blogs list
 */
exports.getAdminBlogs = async (req, res, next) => {
  try {
    const result = await blogService.getAdminBlogs(req.query);
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
};

/**
 * Create blog (admin)
 */
exports.createBlog = async (req, res, next) => {
  try {
    const rawTitle = req.body.title || req.body.name || req.body.blogTitle;
    if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const rawImage = req.body.featured_image || req.body.image || req.body.imageUrl || req.body.featuredImage;

    const blogData = {
      title: rawTitle.trim(),
      slug: req.body.slug ? String(req.body.slug).trim() : undefined,
      excerpt: req.body.excerpt ? String(req.body.excerpt).trim() : '',
      content: req.body.content ? String(req.body.content).trim() : '',
      category: (req.body.category && req.body.category.trim() && req.body.category !== 'null' && req.body.category !== 'undefined') ? req.body.category.trim() : null,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(',').map((t) => t.trim()).filter(Boolean)) : [],
      author: req.body.author ? String(req.body.author).trim() : 'Homeopathy Team',
      author_bio: req.body.author_bio,
      featured_image_alt: req.body.featured_image_alt,
      published: req.body.published === 'true' || req.body.published === true,
      featured: req.body.featured === 'true' || req.body.featured === true,
    };

    if (rawImage && typeof rawImage === 'string' && rawImage.trim()) {
      blogData.featured_image = rawImage.trim();
    }

    // Handle image upload (takes precedence)
    if (req.file) {
      blogData.featured_image = `/uploads/${req.file.filename}`;
      blogData.featured_image_path = req.file.path;
    }

    const blog = await blogService.createBlog(blogData, req.user?._id);
    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

/**
 * Update blog (admin)
 */
exports.updateBlog = async (req, res, next) => {
  try {
    const rawImage = req.body.featured_image || req.body.image || req.body.imageUrl || req.body.featuredImage;

    const blogData = {
      title: req.body.title,
      slug: req.body.slug,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      tags: req.body.tags ? (Array.isArray(req.body.tags) ? req.body.tags : String(req.body.tags).split(',').map((t) => t.trim()).filter(Boolean)) : undefined,
      author: req.body.author,
      author_bio: req.body.author_bio,
      featured_image_alt: req.body.featured_image_alt,
      published: req.body.published !== undefined ? (req.body.published === 'true' || req.body.published === true) : undefined,
      featured: req.body.featured !== undefined ? (req.body.featured === 'true' || req.body.featured === true) : undefined,
    };

    if (rawImage && typeof rawImage === 'string' && rawImage.trim()) {
      blogData.featured_image = rawImage.trim();
    }

    // Handle image upload (takes precedence)
    if (req.file) {
      blogData.featured_image = `/uploads/${req.file.filename}`;
      blogData.featured_image_path = req.file.path;
    }

    const blog = await blogService.updateBlog(req.params.id, blogData, req.user?._id);
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete blog (admin)
 */
exports.deleteBlog = async (req, res, next) => {
  try {
    await blogService.deleteBlog(req.params.id);
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    next(error);
  }
};
