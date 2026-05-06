const blogService = require('../../services/blogService');
const multer = require('../../utils/multer');

exports.getAllBlogs = async (req, res, next) => {
  try {
    const result = await blogService.getAllBlogs(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

exports.getBlogBySlug = async (req, res, next) => {
  try {
    const blog = await blogService.getBlogBySlug(req.params.slug);
    res.json({ success: true, data: blog });
  } catch (error) {
    next(error);
  }
};

exports.createBlog = async (req, res, next) => {
  try {
    const blogData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      author: req.body.author,
      meta_description: req.body.meta_description,
      meta_keywords: req.body.meta_keywords,
      published: req.body.published || false,
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

exports.updateBlog = async (req, res, next) => {
  try {
    const blogData = {
      title: req.body.title,
      excerpt: req.body.excerpt,
      content: req.body.content,
      category: req.body.category,
      author: req.body.author,
      meta_description: req.body.meta_description,
      meta_keywords: req.body.meta_keywords,
      published: req.body.published,
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

exports.deleteBlog = async (req, res, next) => {
  try {
    await blogService.deleteBlog(req.params.id);
    res.json({ success: true, message: 'Blog deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.getAdminBlogs = async (req, res, next) => {
  try {
    const result = await blogService.getAdminBlogs(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};
