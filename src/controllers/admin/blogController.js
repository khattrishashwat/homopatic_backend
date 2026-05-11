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
    const blogData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      tags: req.body.tags ? String(req.body.tags).split(',').map((t) => t.trim()) : [],
      author: req.body.author,
      author_bio: req.body.author_bio,
      seo_title: req.body.seo_title,
      meta_description: req.body.meta_description,
      meta_keywords: req.body.meta_keywords ? String(req.body.meta_keywords).split(',').map((k) => k.trim()) : [],
      canonical_url: req.body.canonical_url,
      og_image: req.body.og_image,
      featured_image_alt: req.body.featured_image_alt,
      published: req.body.published === 'true' || req.body.published === true,
      featured: req.body.featured === 'true' || req.body.featured === true,
    };

    // Handle image upload
    if (req.file) {
      blogData.featured_image = `/uploads/${req.file.filename}`;
      blogData.featured_image_path = req.file.path;
    }

    const blog = await blogService.createBlog(blogData, req.user._id);
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
    const blogData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      tags: req.body.tags ? String(req.body.tags).split(',').map((t) => t.trim()) : [],
      author: req.body.author,
      author_bio: req.body.author_bio,
      seo_title: req.body.seo_title,
      meta_description: req.body.meta_description,
      meta_keywords: req.body.meta_keywords ? String(req.body.meta_keywords).split(',').map((k) => k.trim()) : [],
      canonical_url: req.body.canonical_url,
      og_image: req.body.og_image,
      featured_image_alt: req.body.featured_image_alt,
      published: req.body.published === 'true' || req.body.published === true,
      featured: req.body.featured === 'true' || req.body.featured === true,
    };

    // Handle image upload
    if (req.file) {
      blogData.featured_image = `/uploads/${req.file.filename}`;
      blogData.featured_image_path = req.file.path;
    }

    const blog = await blogService.updateBlog(req.params.id, blogData, req.user._id);
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
