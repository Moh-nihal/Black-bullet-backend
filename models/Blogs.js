const mongoose = require("mongoose");

const { Schema } = mongoose;

const localizedTitleSchema = new Schema(
  {
    en: {
      type: String,
      required: [true, "English title is required"],
      trim: true,
      minlength: [3, "English title must be at least 3 characters"],
      maxlength: [180, "English title cannot exceed 180 characters"],
    },
    ar: {
      type: String,
      required: [true, "Arabic title is required"],
      trim: true,
      minlength: [3, "Arabic title must be at least 3 characters"],
      maxlength: [180, "Arabic title cannot exceed 180 characters"],
    },
  },
  { _id: false }
);

const localizedContentSchema = new Schema(
  {
    en: {
      type: String,
      required: [true, "English content is required"],
      trim: true,
      minlength: [1, "English content is required"],
    },
    ar: {
      type: String,
      required: [true, "Arabic content is required"],
      trim: true,
      minlength: [1, "Arabic content is required"],
    },
  },
  { _id: false }
);

const makeOptionalLocalizedPairSchema = (maxLen) =>
  new Schema(
    {
      en: {
        type: String,
        trim: true,
        maxlength: [maxLen, `English text cannot exceed ${maxLen} characters`],
        default: "",
      },
      ar: {
        type: String,
        trim: true,
        maxlength: [maxLen, `Arabic text cannot exceed ${maxLen} characters`],
        default: "",
      },
    },
    { _id: false }
  );

const localizedCategorySchema = makeOptionalLocalizedPairSchema(120);
const localizedShortDescSchema = makeOptionalLocalizedPairSchema(500);
const localizedMetaTitleSchema = makeOptionalLocalizedPairSchema(180);
const localizedMetaDescriptionSchema = makeOptionalLocalizedPairSchema(320);

const migrateLegacyLocalized = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return { en: trimmed, ar: trimmed };
  }
  return value;
};

const blogPostSchema = new Schema(
  {
    title: {
      type: localizedTitleSchema,
      required: [true, "Blog title is required"],
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
      type: localizedCategorySchema,
      default: () => ({ en: "", ar: "" }),
      index: true,
    },
    shortDesc: {
      type: localizedShortDescSchema,
      default: () => ({ en: "", ar: "" }),
    },
    content: {
      type: localizedContentSchema,
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
      type: localizedMetaTitleSchema,
      default: () => ({ en: "", ar: "" }),
    },
    metaDescription: {
      type: localizedMetaDescriptionSchema,
      default: () => ({ en: "", ar: "" }),
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

blogPostSchema.pre("validate", function migrateLegacyBlogDocument() {
  if (typeof this.title === "string") this.title = migrateLegacyLocalized(this.title);
  if (typeof this.category === "string") this.category = migrateLegacyLocalized(this.category);
  if (typeof this.shortDesc === "string") this.shortDesc = migrateLegacyLocalized(this.shortDesc);
  if (typeof this.content === "string") this.content = migrateLegacyLocalized(this.content);
  if (typeof this.metaTitle === "string") this.metaTitle = migrateLegacyLocalized(this.metaTitle);
  if (typeof this.metaDescription === "string") {
    this.metaDescription = migrateLegacyLocalized(this.metaDescription);
  }
});

blogPostSchema.index({ status: 1, publishedAt: -1 });
blogPostSchema.index({
  "title.en": "text",
  "title.ar": "text",
  "shortDesc.en": "text",
  "shortDesc.ar": "text",
  "content.en": "text",
  "content.ar": "text",
});

const BlogPost = mongoose.models.BlogPost || mongoose.model("BlogPost", blogPostSchema);

if (!mongoose.models.Blog) {
  mongoose.model("Blog", blogPostSchema, "blogs");
}

module.exports = BlogPost;
