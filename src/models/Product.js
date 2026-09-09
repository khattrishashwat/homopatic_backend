const mongoose = require("mongoose");

const slugify = (value) =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

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
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
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
        url: String,
        alt: String,
      },
    ],

    // Product Attributes
    attributes: {
      type: mongoose.Schema.Types.Mixed,
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

    recommended: {
      type: Boolean,
      default: false,
      index: true,
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
});

// Other Indexes
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ active: 1, featured: 1 });
ProductSchema.index({ active: 1, recommended: 1 });

/**
 * Generate unique slug
 */
ProductSchema.statics.generateUniqueSlug = async function (
  name,
  productId = null
) {
  const baseSlug = slugify(name);

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await this.findOne({
      slug,
      ...(productId && { _id: { $ne: productId } }),
    });

    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter++;
  }
};

/**
 * Auto generate slug and image alt
 */
ProductSchema.pre("save", async function (next) {
  try {
    // Generate unique slug from name
    if (this.isModified("name")) {
      this.slug = await this.constructor.generateUniqueSlug(
        this.name,
        this._id
      );
    }

    // Auto image alt from product name
    if ((!this.image_alt || this.image_alt.trim() === "") && this.name) {
      this.image_alt = `${this.name} image`;
    }

    // Auto gallery alts
    if (this.gallery && this.gallery.length > 0) {
      this.gallery = this.gallery.map((item, index) => ({
        ...item,
        alt:
          item.alt && item.alt.trim() !== ""
            ? item.alt
            : `${this.name} gallery image ${index + 1}`,
      }));
    }

    // Auto stock status
    this.in_stock = this.stock > 0;

    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model("Product", ProductSchema);