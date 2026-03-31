const mongoose = require("mongoose");

const { Schema } = mongoose;

const landingLeadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    vehicleModel: { type: String, trim: true },
    message: { type: String, trim: true },
    landingPageId: { type: Schema.Types.ObjectId, ref: "LandingPage", required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, required: true, index: true },
    status: {
      type: String,
      enum: ["new", "contacted", "qualified", "closed", "lost"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LandingLead", landingLeadSchema);
