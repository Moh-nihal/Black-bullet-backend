const mongoose = require("mongoose");

const { Schema } = mongoose;

const makeOptionalLocalizedPairSchema = (maxLength = 200) => {
  return new Schema(
    {
      en: { type: String, trim: true, maxlength: maxLength, default: "" },
      ar: { type: String, trim: true, maxlength: maxLength, default: "" },
    },
    { _id: false }
  );
};

const localizeRequired = (maxLength = 200) => {
  return new Schema(
    {
      en: { type: String, trim: true, maxlength: maxLength, required: true },
      ar: { type: String, trim: true, maxlength: maxLength, default: "" },
    },
    { _id: false }
  );
};

const migrateLegacyLocalized = (val) => {
  if (typeof val === "string") return { en: val, ar: "" };
  if (!val) return { en: "", ar: "" };
  return { en: val.en || "", ar: val.ar || "" };
};

const galleryItemSchema = new Schema(
  {
    title: {
      type: localizeRequired(180)
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
      type: makeOptionalLocalizedPairSchema(100),
      default: () => ({ en: "", ar: "" }),
      index: true,
    },
    description: {
      type: makeOptionalLocalizedPairSchema(1000),
      default: () => ({ en: "", ar: "" })
    },
    altText: {
      type: makeOptionalLocalizedPairSchema(180),
      default: () => ({ en: "", ar: "" })
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

galleryItemSchema.pre("validate", function (next) {
  if (typeof this.title === "string") this.title = migrateLegacyLocalized(this.title);
  if (typeof this.category === "string") this.category = migrateLegacyLocalized(this.category);
  if (typeof this.description === "string") this.description = migrateLegacyLocalized(this.description);
  if (typeof this.altText === "string") this.altText = migrateLegacyLocalized(this.altText);
  next();
});

galleryItemSchema.index({ type: 1, "category.en": 1, status: 1, sortOrder: 1, createdAt: -1 });
galleryItemSchema.index({ 
  "title.en": "text", 
  "title.ar": "text", 
  "description.en": "text", 
  "description.ar": "text", 
  "category.en": "text",
  "category.ar": "text" 
});

module.exports = mongoose.model("GalleryItem", galleryItemSchema);
