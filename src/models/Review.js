const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['product_review', 'blog_comment', 'google_review', 'testimonial', 'patient_story'],
      required: true,
      index: true,
    },
    target_slug: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 200,
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
      default: 5,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    profileImage: {
      type: String,
      trim: true,
    },
    relativeTime: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
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
ReviewSchema.index({ type: 1, approved: 1, order: 1, createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);
