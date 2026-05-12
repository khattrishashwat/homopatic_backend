const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    // Category Name
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },

    // SEO Friendly Slug
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Description
    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Category Image
    image: {
      type: String,
      default: "",
    },

    // Image Alt
    image_alt: {
      type: String,
      default: "",
    },

    // Active Status
    active: {
      type: Boolean,
      default: true,
    },

    // Category Type
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
});

// Slug Index
CategorySchema.index({ slug: 1 });

// Active + Type Index
CategorySchema.index({ active: 1, type: 1 });

module.exports = mongoose.model("Category", CategorySchema);