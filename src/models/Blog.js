const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true }, // Rich HTML content
  category: { type: String, enum: ['treatment', 'lifestyle', 'wellness', 'news'], default: 'wellness' },
  featured_image: { type: String }, // Image URL
  featured_image_path: { type: String }, // Local path for file deletion
  author: { type: String, default: 'Homeopathy Team' },
  meta_description: { type: String }, // SEO
  meta_keywords: { type: String }, // SEO
  published: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  published_at: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Blog', BlogSchema);
