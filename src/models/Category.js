const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
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

    description: {
      type: String,
      trim: true,
    },

    // Image
    image: {
      type: String,
    },

    image_alt: {
      type: String,
      trim: true,
    },

    // SEO Fields
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
        trim: true,
      },
    ],

    canonical_url: {
      type: String,
    },

    // Status
    active: {
      type: Boolean,
      default: true,
    },

    // Type: can be used for 'blog', 'product', or both
    type: {
      type: String,
      enum: ["blog", "product", "both"],
      default: "both",
    },
  },
  {
    timestamps: true,
  }
);

// Text Search Index
CategorySchema.index({
  name: "text",
  description: "text",
  seo_title: "text",
  seo_description: "text",
});

// Slug Index
CategorySchema.index({ slug: 1 });

// Active and Type Index
CategorySchema.index({ active: 1, type: 1 });

module.exports = mongoose.model("Category", CategorySchema);
