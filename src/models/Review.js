const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['product_review', 'blog_comment'],
      required: true,
      index: true,
    },
    target_slug: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    approved: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

ReviewSchema.index({ type: 1, target_slug: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
