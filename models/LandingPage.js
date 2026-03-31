const mongoose = require("mongoose");

const { Schema } = mongoose;

const dailyMetricSchema = new Schema(
  {
    date: { type: Date, required: true },
    views: { type: Number, default: 0 },
    conversions: {
      whatsapp: { type: Number, default: 0 },
      call: { type: Number, default: 0 },
      form: { type: Number, default: 0 },
    },
  },
  { _id: false }
);

const variantSchema = new Schema(
  {
    name: { type: String, default: "Variant A", trim: true },
    weight: { type: Number, default: 100, min: 0 },
    content: { type: Schema.Types.Mixed, default: {} },
    analytics: {
      views: { type: Number, default: 0 },
      conversions: {
        whatsapp: { type: Number, default: 0 },
        call: { type: Number, default: 0 },
        form: { type: Number, default: 0 },
      },
      devices: {
        desktop: { type: Number, default: 0 },
        mobile: { type: Number, default: 0 },
        tablet: { type: Number, default: 0 },
      },
      dailyMetrics: { type: [dailyMetricSchema], default: [] },
    },
  },
  { _id: true }
);

const landingPageSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, trim: true, lowercase: true },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "archived"],
      default: "draft",
      index: true,
    },
    utmSource: { type: String, trim: true },
    utmCampaign: { type: String, trim: true },
    metaTitle: Schema.Types.Mixed,
    metaDescription: Schema.Types.Mixed,
    variants: { type: [variantSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LandingPage", landingPageSchema);
