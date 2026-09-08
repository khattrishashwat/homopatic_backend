const Blog = require('../models/Blog');
const fs = require('fs').promises;

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/**
 * Calculate reading time from content
 */
const calculateReadingTime = (content) => {
  const wordsPerMinute = 200;
  const wordCount = (content || '').trim().split(/\s+/).filter(word => word.length > 0).length;
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
};

/**
 * Get all published blogs with filters
 */
exports.getAllBlogs = async (filters = {}) => {
  const query = { published: true };

  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.tags) {
    const tags = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
    query.tags = { $in: tags };
  }
  if (filters.featured) {
    query.featured = true;
  }

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find(query)
    .sort({ published_at: -1 })
    .skip(skip)
    .limit(limit)
    .populate('category', 'name slug')
    .populate('created_by', 'name')
    .select('title slug excerpt category featured_image author published_at views reading_time featured');

  const total = await Blog.countDocuments(query);

  return {
    data: blogs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get blog by slug
 */
exports.getBlogBySlug = async (slug) => {
  const blog = await Blog.findOne({ slug, published: true })
    .populate('category', 'name slug')
    .populate('created_by', 'name');

  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  // Increment views
  blog.views += 1;
  await blog.save();

  return blog;
};

/**
 * Get single blog by ID (admin)
 */
exports.getBlogById = async (id) => {
  const blog = await Blog.findById(id)
    .populate('category', 'name slug')
    .populate('created_by', 'name');

  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  return blog;
};

/**
 * Get featured blogs
 */
exports.getFeaturedBlogs = async (limit = 3) => {
  const blogs = await Blog.find({ published: true, featured: true })
    .sort({ published_at: -1 })
    .limit(limit)
    .populate('category', 'name slug')
    .select('title slug excerpt featured_image author published_at');

  return blogs;
};

/**
 * Get related blogs
 */
exports.getRelatedBlogs = async (blogId, limit = 3) => {
  const blog = await Blog.findById(blogId);
  if (!blog) return [];

  const blogs = await Blog.find({
    _id: { $ne: blogId },
    published: true,
    category: blog.category,
  })
    .sort({ published_at: -1 })
    .limit(limit)
    .select('title slug excerpt featured_image');

  return blogs;
};

/**
 * Create blog (admin)
 */
exports.createBlog = async (data, userId) => {
  // Generate slug
  const blogSlug = slugify(data.title);

  // Check slug uniqueness
  const existing = await Blog.findOne({ slug: blogSlug });
  if (existing) {
    const error = new Error('Blog with this title already exists');
    error.statusCode = 400;
    throw error;
  }

  // Calculate reading time if content provided
  const readingTime = data.reading_time || calculateReadingTime(data.content);

  const blog = await Blog.create({
    title: data.title,
    slug: blogSlug,
    excerpt: data.excerpt,
    content: data.content,
    category: data.category || null,
    tags: data.tags || [],
    featured_image: data.featured_image,
    featured_image_path: data.featured_image_path,
    featured_image_alt: data.featured_image_alt,
    featured_image_alt: data.featured_image_alt,
    author: data.author || 'Homeopathy Team',
    author_bio: data.author_bio,
    reading_time: readingTime,
    published: data.published || false,
    published_at: data.published ? new Date() : null,
    featured: data.featured || false,
    created_by: userId,
  });

  return blog;
};

/**
 * Update blog (admin)
 */
exports.updateBlog = async (id, data, userId) => {
  const blog = await Blog.findById(id);
  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  // Update slug if title changed
  if (data.title && data.title !== blog.title) {
    const newSlug = slugify(data.title);
    const existing = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existing) {
      const error = new Error('Blog with this title already exists');
      error.statusCode = 400;
      throw error;
    }
    blog.slug = newSlug;
  }

  // Update allowed fields
  const updateFields = [
    'title', 'excerpt', 'content', 'category', 'tags',
    'featured_image_alt', 'author', 'author_bio'
  ];

  // Update reading time if content changed
  if (data.content && data.content !== blog.content) {
    blog.reading_time = calculateReadingTime(data.content);
  }

  // Handle publishing status change
  if (data.published !== undefined && data.published !== blog.published) {
    blog.published = data.published;
    blog.published_at = data.published ? new Date() : null;
  }

  // Handle featured status
  if (data.featured !== undefined) {
    blog.featured = data.featured;
  }

  blog.updatedAt = new Date();
  await blog.save();

  return blog;
};

/**
 * Delete blog (admin)
 */
exports.deleteBlog = async (id) => {
  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  // Delete featured image from filesystem
  if (blog.featured_image_path) {
    try {
      await fs.unlink(blog.featured_image_path);
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  }

  return blog;
};

/**
 * Get admin blogs list
 */
exports.getAdminBlogs = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { excerpt: { $regex: filters.search, $options: 'i' } },
      { content: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.category) query.category = filters.category;
  if (filters.published !== undefined) query.published = filters.published === 'true';
  if (filters.featured !== undefined) query.featured = filters.featured === 'true';

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('category', 'name')
    .populate('created_by', 'name email');

  const total = await Blog.countDocuments(query);

  return {
    data: blogs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Search blogs
 */
exports.searchBlogs = async (query, limit = 10) => {
  const blogs = await Blog.find(
    { published: true, $text: { $search: query } },
    { score: { $meta: "textScore" } }
  )
    .sort({ score: { $meta: "textScore" } })
    .limit(limit)
    .select('title slug excerpt featured_image');

  return blogs;
};

/**
 * Get blogs by category
 */
exports.getBlogsByCategory = async (categoryId, filters = {}) => {
  const query = { category: categoryId, published: true };

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find(query)
    .sort({ published_at: -1 })
    .skip(skip)
    .limit(limit)
    .select('title slug excerpt featured_image author published_at views');

  const total = await Blog.countDocuments(query);

  return {
    data: blogs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};
