const mongoose = require("mongoose");

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const ProductSchema = new mongoose.Schema(
  {
    // Basic Info
    name: {
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

    short_description: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
    },

    // Pricing
    price: {
      type: Number,
      required: true,
    },

    compare_price: {
      type: Number,
    },

    // Inventory
    stock: {
      type: Number,
      default: 0,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    in_stock: {
      type: Boolean,
      default: true,
    },

    // Category
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    // Images
    image: {
      type: String,
    },

    image_alt: {
      type: String,
      trim: true,
    },

    gallery: [
      {
        url: {
          type: String,
        },
        alt: {
          type: String,
          trim: true,
        },
      },
    ],

    // Product Attributes
    attributes: {
      type: mongoose.Schema.Types.Mixed,
    },

    // Medicine Specific
    manufacturer: {
      type: String,
    },

    dosage_form: {
      type: String,
    },

    composition: {
      type: String,
    },

    prescription_required: {
      type: Boolean,
      default: false,
    },

    // Physical
    weight: {
      type: Number,
    },

    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },

    // SEO
    seo_title: {
      type: String,
      trim: true,
    },

    seo_description: {
      type: String,
      trim: true,
    },

    seo_keywords: [
      {
        type: String,
      },
    ],

    canonical_url: {
      type: String,
    },

    og_image: {
      type: String,
    },

    // Status
    active: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    // Ratings
    average_rating: {
      type: Number,
      default: 0,
    },

    total_reviews: {
      type: Number,
      default: 0,
    },

    // Audit
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

// Text Search Index
ProductSchema.index({
  name: "text",
  description: "text",
  short_description: "text",
  seo_title: "text",
  seo_description: "text",
});

// Slug Index
ProductSchema.index({ slug: 1 });

// Category Index
ProductSchema.index({ category: 1 });

// Active and Featured Index
ProductSchema.index({ active: 1, featured: 1 });

// Auto-generate slug before saving
ProductSchema.pre('save', function(next) {
  if (this.isModified('name') && !this.isModified('slug')) {
    let baseSlug = slugify(this.name);
    this.slug = this.ensureUniqueSlug(baseSlug);
  }
  next();
});

ProductSchema.methods.ensureUniqueSlug = async function(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await this.constructor.findOne({ slug, _id: { $ne: this._id } });
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }
  return slug;
};

module.exports = mongoose.model("Product", ProductSchema);