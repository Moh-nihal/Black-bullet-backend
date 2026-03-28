const mongoose = require("mongoose");

const { Schema } = mongoose;
const DUBAI_UTC_OFFSET_MINUTES = 4 * 60;
const ACTIVE_BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "IN-PROGRESS", "COMPLETED", "CRITICAL"];

const getDubaiSlotKey = (preferredDate) => {
  if (!(preferredDate instanceof Date) || Number.isNaN(preferredDate.getTime())) return null;
  const shifted = new Date(preferredDate.getTime() + (DUBAI_UTC_OFFSET_MINUTES * 60 * 1000));
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth() + 1;
  const day = shifted.getUTCDate();
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}|${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const bookingSchema = new Schema(
  {
    // Frontend field: `name`
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters"],
      maxlength: [120, "Customer name cannot exceed 120 characters"],
      alias: "name",
      index: true,
    },

    // Frontend field: `email`
    email: {
      type: String,
      required: function () {
        // Allow updates to pre-existing records that may not have these fields.
        return this.isNew;
      },
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
      index: true,
    },

    // Not currently collected by the frontend form, but kept for flexibility.
    phone: {
      type: String,
      trim: true,
      minlength: [6, "Phone number is too short"],
      maxlength: [25, "Phone number is too long"],
    },

    // Frontend selection field: vehicle type (e.g. "Supercar / Exotic")
    vehicleType: {
      type: String,
      required: function () {
        return this.isNew;
      },
      trim: true,
      maxlength: [120, "Vehicle type cannot exceed 120 characters"],
      index: true,
    },

    serviceType: {
      type: String,
      required: [true, "Service type is required"],
      trim: true,
      maxlength: [120, "Service type cannot exceed 120 characters"],
      index: true,
    },

    preferredDate: {
      type: Date,
      required: [true, "Preferred date is required"],
      index: true,
    },

    // Frontend selection field: time slot (e.g. "09:00 AM")
    preferredTime: {
      type: String,
      required: function () {
        return this.isNew;
      },
      trim: true,
      maxlength: [20, "Preferred time cannot exceed 20 characters"],
      index: true,
    },
    slotKey: {
      type: String,
      trim: true,
      index: true,
    },

    // Helpful for displaying the exact UI selection back to users/admin.
    preferredDateLabel: {
      type: String,
      trim: true,
      maxlength: [64, "Preferred date label cannot exceed 64 characters"],
    },

    preferredDay: {
      type: String,
      trim: true,
      maxlength: [3, "Preferred day cannot exceed 3 characters"],
    },

    preferredDateNumber: {
      type: Number,
      min: [1, "Preferred date number must be >= 1"],
      max: [31, "Preferred date number must be <= 31"],
    },

    vehicleDetails: {
      make: {
        type: String,
        trim: true,
        maxlength: [120, "Vehicle make cannot exceed 120 characters"],
      },
      model: {
        type: String,
        required: function () {
          return this.isNew;
        },
        trim: true,
        maxlength: [120, "Vehicle model cannot exceed 120 characters"],
        // Frontend field: `model`
        alias: "model",
      },
      year: {
        type: Number,
        min: [1900, "Vehicle year is invalid"],
      },
      plateNumber: {
        type: String,
        trim: true,
        maxlength: [40, "Plate number cannot exceed 40 characters"],
      },
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, "Notes cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "IN-PROGRESS", "COMPLETED", "CANCELLED", "CRITICAL"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Normalize legacy status values (e.g. "pending", "in_progress") to the current enum.
bookingSchema.pre("validate", function normalizeLegacyStatus() {
  if (typeof this.status === "string") {
    const candidate = this.status
      .trim()
      .toUpperCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

    const allowed = new Set([
      "PENDING",
      "CONFIRMED",
      "IN-PROGRESS",
      "COMPLETED",
      "CANCELLED",
      "CRITICAL",
    ]);
    if (allowed.has(candidate)) this.status = candidate;
  }

  if (this.preferredDate instanceof Date && !Number.isNaN(this.preferredDate.getTime())) {
    this.slotKey = getDubaiSlotKey(this.preferredDate);
  }
});

bookingSchema.index({ vehicleType: 1, preferredDate: 1 });
bookingSchema.index({ serviceType: 1, preferredDate: 1 });
bookingSchema.index({ status: 1, preferredDate: 1 });
bookingSchema.index(
  { slotKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      slotKey: { $exists: true },
      status: { $in: ACTIVE_BLOCKING_STATUSES },
    },
  }
);

module.exports = mongoose.model("Booking", bookingSchema);
