const mongoose = require("mongoose");

const { Schema } = mongoose;

const galleryItemSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Gallery item title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [180, "Title cannot exceed 180 characters"],
    },
    type: {
      type: String,
      enum: ["image", "video"],
      required: [true, "Gallery item type is required"],
      index: true,
    },
    url: {
      type: String,
      required: [true, "Media URL is required"],
      trim: true,
    },
    width: {
      type: Number,
      min: [1, "Width must be greater than 0"],
      default: null,
    },
    height: {
      type: Number,
      min: [1, "Height must be greater than 0"],
      default: null,
    },
    thumbnail: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, "Category cannot exceed 100 characters"],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    altText: {
      type: String,
      trim: true,
      maxlength: [180, "Alt text cannot exceed 180 characters"],
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft"],
      default: "active",
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    publicId: {
      type: String,
      trim: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

galleryItemSchema.index({ type: 1, category: 1, status: 1, sortOrder: 1, createdAt: -1 });
galleryItemSchema.index({ title: "text", description: "text", category: "text" });

module.exports = mongoose.model("GalleryItem", galleryItemSchema);
