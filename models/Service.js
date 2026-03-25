const mongoose = require("mongoose");

const { Schema } = mongoose;

const serviceSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Service title is required"],
      trim: true,
      minlength: [2, "Service title must be at least 2 characters"],
      maxlength: [120, "Service title cannot exceed 120 characters"],
      alias: "name",
    },
    slug: {
      type: String,
      required: [true, "Service slug is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [2, "Slug must be at least 2 characters"],
      maxlength: [140, "Slug cannot exceed 140 characters"],
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    price: {
      type: Number,
      min: [0, "Price cannot be negative"],
      default: 0,
      index: true,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    features: [
      {
        type: String,
        trim: true,
      },
    ],
    category: {
      type: String,
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft", "hidden"],
      default: "active",
      index: true,
    },
    metaTitle: {
      type: String,
      trim: true,
      maxlength: [180, "Meta title cannot exceed 180 characters"],
    },
    metaDescription: {
      type: String,
      trim: true,
      maxlength: [320, "Meta description cannot exceed 320 characters"],
    },
    metaKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ title: 1 });
serviceSchema.index({ category: 1, title: 1 });

serviceSchema.virtual("image")
  .get(function getPrimaryImage() {
    return Array.isArray(this.images) && this.images.length > 0 ? this.images[0] : undefined;
  })
  .set(function setPrimaryImage(value) {
    if (!value) return;
    this.images = [value];
  });

module.exports = mongoose.model("Service", serviceSchema);
