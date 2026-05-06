const Blog = require('../models/Blog');
const { v4: uuidv4 } = require('uuid');
const slug = require('slug');
const fs = require('fs').promises;
const path = require('path');

exports.getAllBlogs = async (filters = {}) => {
  const query = { published: true };

  if (filters.category) query.category = filters.category;

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 10;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find(query)
    .sort({ published_at: -1 })
    .skip(skip)
    .limit(limit)
    .select('title slug excerpt category featured_image author published_at views');

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

exports.getBlogBySlug = async (blogSlug) => {
  const blog = await Blog.findOne({ slug: blogSlug });
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

exports.createBlog = async (data, userId) => {
  const blogSlug = slug(data.title, { lower: true });

  // Check if slug already exists
  const existingBlog = await Blog.findOne({ slug: blogSlug });
  if (existingBlog) {
    const error = new Error('Blog title already exists');
    error.statusCode = 400;
    throw error;
  }

  const blog = await Blog.create({
    title: data.title,
    slug: blogSlug,
    excerpt: data.excerpt,
    content: data.content,
    category: data.category || 'wellness',
    featured_image: data.featured_image,
    featured_image_path: data.featured_image_path,
    author: data.author || 'Homeopathy Team',
    meta_description: data.meta_description,
    meta_keywords: data.meta_keywords,
    published: data.published || false,
    published_at: data.published ? new Date() : null,
    created_by: userId,
  });

  return blog;
};

exports.updateBlog = async (id, data, userId) => {
  const blog = await Blog.findById(id);
  if (!blog) {
    const error = new Error('Blog not found');
    error.statusCode = 404;
    throw error;
  }

  // If title changed, update slug
  if (data.title && data.title !== blog.title) {
    const newSlug = slug(data.title, { lower: true });
    const existingBlog = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
    if (existingBlog) {
      const error = new Error('Blog title already exists');
      error.statusCode = 400;
      throw error;
    }
    blog.slug = newSlug;
  }

  // Handle image replacement
  if (data.featured_image && data.featured_image !== blog.featured_image) {
    if (blog.featured_image_path) {
      try {
        await fs.unlink(blog.featured_image_path);
      } catch (err) {
        console.error('Failed to delete old image:', err);
      }
    }
    blog.featured_image = data.featured_image;
    blog.featured_image_path = data.featured_image_path;
  }

  // Update other fields
  Object.assign(blog, {
    title: data.title || blog.title,
    excerpt: data.excerpt || blog.excerpt,
    content: data.content || blog.content,
    category: data.category || blog.category,
    author: data.author || blog.author,
    meta_description: data.meta_description || blog.meta_description,
    meta_keywords: data.meta_keywords || blog.meta_keywords,
  });

  // Handle publishing
  if (data.published !== undefined && data.published !== blog.published) {
    blog.published = data.published;
    blog.published_at = data.published ? new Date() : null;
  }

  blog.updatedAt = new Date();
  await blog.save();

  return blog;
};

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

exports.getAdminBlogs = async (filters = {}) => {
  const query = {};

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { excerpt: { $regex: filters.search, $options: 'i' } },
    ];
  }

  if (filters.category) query.category = filters.category;
  if (filters.published !== undefined) query.published = filters.published === 'true';

  const page = parseInt(filters.page) || 1;
  const limit = parseInt(filters.limit) || 20;
  const skip = (page - 1) * limit;

  const blogs = await Blog.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
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
