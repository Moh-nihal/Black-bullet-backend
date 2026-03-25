const mongoose = require("mongoose");

const { Schema } = mongoose;

const bookingSchema = new Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Customer name must be at least 2 characters"],
      maxlength: [120, "Customer name cannot exceed 120 characters"],
      alias: "name",
    },
    phone: {
      type: String,
      trim: true,
      minlength: [6, "Phone number is too short"],
      maxlength: [25, "Phone number is too long"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
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
    vehicleDetails: {
      make: {
        type: String,
        trim: true,
        maxlength: [120, "Vehicle make cannot exceed 120 characters"],
      },
      model: {
        type: String,
        trim: true,
        maxlength: [120, "Vehicle model cannot exceed 120 characters"],
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
      enum: ["pending", "confirmed", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.path("phone").validate(function validateContactPhone(value) {
  return Boolean(value || this.email);
}, "Either phone or email is required");

bookingSchema.path("email").validate(function validateContactEmail(value) {
  return Boolean(value || this.phone);
}, "Either email or phone is required");

bookingSchema.index({ serviceType: 1, preferredDate: 1 });
bookingSchema.index({ status: 1, preferredDate: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
