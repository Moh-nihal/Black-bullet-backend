const mongoose = require("mongoose");

const { Schema } = mongoose;

const ALLOWED_PAGE_KEYS = ["home", "services", "gallery", "blog", "settings"];

const contentPageSchema = new Schema(
  {
    pageKey: {
      type: String,
      required: true,
      unique: true,
      enum: ALLOWED_PAGE_KEYS,
      index: true,
      trim: true,
    },
    data: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ContentPage", contentPageSchema);
module.exports.ALLOWED_PAGE_KEYS = ALLOWED_PAGE_KEYS;
