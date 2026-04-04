const mongoose = require("mongoose");

const { Schema } = mongoose;

const localizedStringSchema = new Schema(
  {
    en: {
      type: String,
      required: [true, "English text is required"],
      trim: true,
      minlength: [2, "English text must be at least 2 characters"],
      maxlength: [120, "English text cannot exceed 120 characters"],
    },
    ar: {
      type: String,
      required: [true, "Arabic text is required"],
      trim: true,
      minlength: [2, "Arabic text must be at least 2 characters"],
      maxlength: [120, "Arabic text cannot exceed 120 characters"],
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

const localizedDescriptionSchema = makeOptionalLocalizedPairSchema(2000);
const localizedCategorySchema = makeOptionalLocalizedPairSchema(100);
const localizedMetaTitleSchema = makeOptionalLocalizedPairSchema(180);
const localizedMetaDescriptionSchema = makeOptionalLocalizedPairSchema(320);

const migrateLegacyLocalized = (value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return { en: trimmed, ar: trimmed };
  }
  return value;
};

const serviceSchema = new Schema(
  {
    title: {
      type: localizedStringSchema,
      required: [true, "Service title is required"],
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
      type: localizedDescriptionSchema,
      default: () => ({ en: "", ar: "" }),
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
        type: localizedStringSchema,
      },
    ],
    category: {
      type: localizedCategorySchema,
      default: () => ({ en: "", ar: "" }),
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "draft", "hidden"],
      default: "active",
      index: true,
    },
    metaTitle: {
      type: localizedMetaTitleSchema,
      default: () => ({ en: "", ar: "" }),
    },
    metaDescription: {
      type: localizedMetaDescriptionSchema,
      default: () => ({ en: "", ar: "" }),
    },
    metaKeywords: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    buttonName: {
      type: makeOptionalLocalizedPairSchema(40),
      default: () => ({ en: "", ar: "" })
    },
    stats: [
      new Schema(
        {
          label: { type: makeOptionalLocalizedPairSchema(40), default: () => ({ en: "", ar: "" }) },
          value: { type: makeOptionalLocalizedPairSchema(40), default: () => ({ en: "", ar: "" }) }
        },
        { _id: false }
      )
    ],
    processSteps: [
      new Schema(
        {
          title: { type: makeOptionalLocalizedPairSchema(100), default: () => ({ en: "", ar: "" }) },
          desc: { type: makeOptionalLocalizedPairSchema(500), default: () => ({ en: "", ar: "" }) }
        },
        { _id: false }
      )
    ]
  },
  {
    timestamps: true,
  }
);

serviceSchema.pre("validate", function migrateLegacyServiceDocument() {
  if (typeof this.title === "string") this.title = migrateLegacyLocalized(this.title);
  if (typeof this.description === "string") this.description = migrateLegacyLocalized(this.description);
  if (typeof this.category === "string") this.category = migrateLegacyLocalized(this.category);
  if (typeof this.metaTitle === "string") this.metaTitle = migrateLegacyLocalized(this.metaTitle);
  if (typeof this.metaDescription === "string") {
    this.metaDescription = migrateLegacyLocalized(this.metaDescription);
  }
  if (typeof this.buttonName === "string") this.buttonName = migrateLegacyLocalized(this.buttonName);

  if (Array.isArray(this.features)) {
    this.features = this.features.map((item) => migrateLegacyLocalized(item));
  }
  if (Array.isArray(this.stats)) {
    this.stats = this.stats.map((stat) => {
      if (typeof stat.label === "string") stat.label = migrateLegacyLocalized(stat.label);
      if (typeof stat.value === "string") stat.value = migrateLegacyLocalized(stat.value);
      return stat;
    });
  }
  if (Array.isArray(this.processSteps)) {
    this.processSteps = this.processSteps.map((step) => {
      if (typeof step.title === "string") step.title = migrateLegacyLocalized(step.title);
      if (typeof step.desc === "string") step.desc = migrateLegacyLocalized(step.desc);
      return step;
    });
  }
});

serviceSchema.index({ slug: 1 }, { unique: true });
serviceSchema.index({ "title.en": 1 });
serviceSchema.index({ "title.ar": 1 });
serviceSchema.index({ category: 1, "title.en": 1 });

serviceSchema.virtual("image")
  .get(function getPrimaryImage() {
    return Array.isArray(this.images) && this.images.length > 0 ? this.images[0] : undefined;
  })
  .set(function setPrimaryImage(value) {
    if (!value) return;
    this.images = [value];
  });

module.exports = mongoose.model("Service", serviceSchema);
