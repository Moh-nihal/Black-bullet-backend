const mongoose = require("mongoose");

const { Schema } = mongoose;

const blogPostSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Blog title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [180, "Title cannot exceed 180 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug format"],
      index: true,
    },
    category: {
      type: String,
      trim: true,
      maxlength: [120, "Category cannot exceed 120 characters"],
      index: true,
    },
    shortDesc: {
      type: String,
      trim: true,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },
    content: {
      type: String,
      required: [true, "Blog content is required"],
    },
    author: {
      type: String,
      trim: true,
      maxlength: [120, "Author cannot exceed 120 characters"],
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    image: {
      type: String,
      trim: true,
      alias: "featuredImage",
    },
    ogImage: {
      type: String,
      trim: true,
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
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
      min: [0, "Views cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({ title: "text", shortDesc: "text", content: "text" });

const BlogPost = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);

if (!mongoose.models.Blog) {
  mongoose.model("Blog", blogPostSchema, "blogs");
}

module.exports = BlogPost;
