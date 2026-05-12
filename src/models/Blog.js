const mongoose = require("mongoose");

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const BlogSchema = new mongoose.Schema(
  {
    // Basic Info
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    excerpt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Rich Content
    content: {
      type: String,
      required: true,
    },

    // Category - Reference to Category model
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      },
    ],

    // Images
    featured_image: {
      type: String,
    },

    featured_image_path: {
      type: String,
    },

    featured_image_alt: {
      type: String,
      trim: true,
    },

    // Author
    author: {
      type: String,
      default: "Homeopathy Team",
    },

    author_bio: {
      type: String,
    },

    // Author
    reading_time: {
      type: Number, // minutes
    },

    // Status
    published: {
      type: Boolean,
      default: false,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    // Analytics
    views: {
      type: Number,
      default: 0,
    },

    published_at: {
      type: Date,
      index: true,
    },

    related_posts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Blog",
      },
    ],

    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

BlogSchema.index({
  title: "text",
  excerpt: "text",
  content: "text",
});

BlogSchema.index({ slug: 1 });

BlogSchema.index({
  category: 1,
  published: 1,
});

BlogSchema.index({
  published: 1,
  published_at: -1,
});

// Auto-generate slug and reading_time before saving
BlogSchema.pre('save', function(next) {
  // Auto-generate slug from title if not provided
  if (this.isModified('title') && !this.isModified('slug')) {
    let baseSlug = slugify(this.title);
    this.slug = this.ensureUniqueSlug(baseSlug);
  }

  // Auto-calculate reading time if content changed and not set
  if (this.isModified('content') && !this.isModified('reading_time')) {
    const wordsPerMinute = 200;
    const wordCount = (this.content || '').trim().split(/\s+/).length;
    this.reading_time = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
  }

  next();
});

BlogSchema.methods.ensureUniqueSlug = async function(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
};

module.exports = mongoose.model("Blog", BlogSchema);