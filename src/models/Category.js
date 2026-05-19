const mongoose = require("mongoose");

const CategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
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
      default: "",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

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

CategorySchema.index({
  name: "text",
  description: "text",
});

CategorySchema.index({ slug: 1 });

CategorySchema.index({ status: 1, type: 1 });

module.exports = mongoose.model("Category", CategorySchema);