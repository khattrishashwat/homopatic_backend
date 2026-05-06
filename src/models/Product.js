const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String },
  price: { type: Number, required: true },
  compare_price: { type: Number }, // Original price before discount
  category: { type: String },
  image: { type: String }, // Main image URL
  image_path: { type: String }, // Local file path
  images: [{ type: String }], // Gallery images
  images_paths: [{ type: String }], // Local file paths
  stock: { type: Number, default: 0 },
  sku: { type: String, unique: true },
  in_stock: { type: Boolean, default: true },
  active: { type: Boolean, default: true },
  weight: { type: Number }, // in kg
  dimensions: {
    length: { type: Number },
    width: { type: Number },
    height: { type: Number },
  },
  attributes: { type: mongoose.Schema.Types.Mixed }, // Dynamic attributes
  seo_title: { type: String },
  seo_description: { type: String },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

module.exports = mongoose.model('Product', ProductSchema);
