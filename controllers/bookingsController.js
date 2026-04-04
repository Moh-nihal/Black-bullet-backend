const Booking = require("../models/Booking");
const ContentPage = require("../models/ContentPage");
const { verifyRecaptchaToken } = require("../utils/recaptcha");

// Vehicle types: keep aligned with frontend BookingForm vehicle step.
// Services: frontend sends `serviceType` (label from published services API); indices below are legacy fallback only.
const vehicleTypes = [
  { label: "Supercar / Exotic" },
  { label: "Hyper Performance" },
  { label: "Custom Build" },
];

const serviceProtocols = [
  { label: "ECU STAGE 2 REMAP" },
  { label: "CARBON AERO FIT" },
];

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DEFAULT_SLOT_DURATION = 30;
const DUBAI_UTC_OFFSET_MINUTES = 4 * 60;
const ACTIVE_BLOCKING_STATUSES = ["PENDING", "CONFIRMED", "IN-PROGRESS", "COMPLETED", "CRITICAL"];

const dayAliases = {
  SUN: 0,
  SUNDAY: 0,
  MON: 1,
  MONDAY: 1,
  TUE: 2,
  TUESDAY: 2,
  WED: 3,
  WEDNESDAY: 3,
  THU: 4,
  THURSDAY: 4,
  FRI: 5,
  FRIDAY: 5,
  SAT: 6,
  SATURDAY: 6,
};

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const getClientIp = (req) => {
  const forwarded = normalizeString(req.headers["x-forwarded-for"]);
  if (forwarded) {
    return normalizeString(forwarded.split(",")[0]);
  }
  return normalizeString(req.ip || req.socket?.remoteAddress);
};

const parseTimeSlot = (timeSlot) => {
  const raw = normalizeString(timeSlot);
  if (!raw) return null;

  const hhmmMatch = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (hhmmMatch) {
    return { hours: Number(hhmmMatch[1]), minutes: Number(hhmmMatch[2]) };
  }

  const match12h = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match12h) return null;

  let hours = Number(match12h[1]);
  const minutes = Number(match12h[2]);
  const meridiem = match12h[3].toUpperCase();

  if (meridiem === "AM") {
    if (hours === 12) hours = 0;
  } else if (meridiem === "PM") {
    if (hours !== 12) hours += 12;
  }

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return { hours, minutes };
};

const parseHHmm = (value) => {
  const raw = normalizeString(value);
  const match = raw.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return { hours: Number(match[1]), minutes: Number(match[2]) };
};

const toMinutes = ({ hours, minutes }) => (hours * 60) + minutes;

const formatMinutesTo24h = (totalMinutes) => {
  const hours24 = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours24).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const normalizeSlotLabel = (value) => {
  const parsed = parseTimeSlot(value);
  if (!parsed) return "";
  return formatMinutesTo24h(toMinutes(parsed));
};

const parseIsoDateOnly = (value) => {
  const raw = normalizeString(value);
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day, 0, 0, 0, 0);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== monthIndex ||
    parsed.getDate() !== day
  ) {
    return null;
  }
  return parsed;
};

const getDubaiDayFromIsoDate = (isoDate) => {
  const parsed = parseIsoDateOnly(isoDate);
  if (!parsed) return null;
  const year = parsed.getFullYear();
  const monthIndex = parsed.getMonth();
  const day = parsed.getDate();
  const noonUtcMs = Date.UTC(year, monthIndex, day, 12, 0, 0, 0);
  const weekday = weekDays[new Date(noonUtcMs).getUTCDay()];
  return {
    year,
    monthIndex,
    day,
    dayLabel: weekday,
    isoDate: `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  };
};

const composeUtcDateFromDubai = ({ year, monthIndex, day, hours, minutes }) =>
  new Date(Date.UTC(year, monthIndex, day, hours, minutes, 0, 0) - (DUBAI_UTC_OFFSET_MINUTES * 60 * 1000));

const getDubaiPartsFromUtcDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  const shifted = new Date(value.getTime() + (DUBAI_UTC_OFFSET_MINUTES * 60 * 1000));
  const year = shifted.getUTCFullYear();
  const monthIndex = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  return {
    year,
    monthIndex,
    day,
    hours,
    minutes,
    isoDate: `${String(year).padStart(4, "0")}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    slotLabel: formatMinutesTo24h((hours * 60) + minutes),
  };
};

const getDubaiUtcRangeForDate = ({ year, monthIndex, day }) => {
  const startUtc = composeUtcDateFromDubai({ year, monthIndex, day, hours: 0, minutes: 0 });
  const endUtc = composeUtcDateFromDubai({ year, monthIndex, day: day + 1, hours: 0, minutes: 0 });
  return { startUtc, endUtc };
};

const computePreferredDate = ({ preferredDateIso, timeSlot }) => {
  const day = getDubaiDayFromIsoDate(preferredDateIso);
  const time = parseTimeSlot(timeSlot);
  if (!day || !time) return null;
  return composeUtcDateFromDubai({
    year: day.year,
    monthIndex: day.monthIndex,
    day: day.day,
    hours: time.hours,
    minutes: time.minutes,
  });
};

const normalizeSlotDuration = (raw) => {
  const value = Number(raw);
  if (!Number.isInteger(value)) return DEFAULT_SLOT_DURATION;
  if (value < 15) return 15;
  if (value > 120) return 120;
  return value;
};

const loadBookingConfig = async () => {
  const settingsPage = await ContentPage.findOne({ pageKey: "settings" }).lean();
  const data = settingsPage?.data || {};

  const slotDuration = normalizeSlotDuration(data.slotDuration || data.slotDurationMinutes);
  const workingHoursArray = Array.isArray(data.workingHours) ? data.workingHours : [];
  const workingHoursByDay = new Map();

  for (const entry of workingHoursArray) {
    const dayKey = normalizeString(entry?.day).toUpperCase();
    const dayIndex = dayAliases[dayKey];
    if (dayIndex === undefined) continue;
    workingHoursByDay.set(dayIndex, {
      day: weekDays[dayIndex],
      open: normalizeString(entry?.open),
      close: normalizeString(entry?.close),
      closed: Boolean(entry?.closed),
    });
  }

  return {
    slotDuration,
    workingHoursByDay,
  };
};

const getSlotsForDate = (targetDate, bookingConfig) => {
  const dayIndex = targetDate.getUTCDay();
  const dayConfig = bookingConfig.workingHoursByDay.get(dayIndex);

  if (!dayConfig || dayConfig.closed) {
    return {
      day: weekDays[dayIndex],
      closed: true,
      slots: [],
      slotDuration: bookingConfig.slotDuration,
    };
  }

  const open = parseHHmm(dayConfig.open);
  const close = parseHHmm(dayConfig.close);
  if (!open || !close) {
    return {
      day: weekDays[dayIndex],
      closed: true,
      slots: [],
      slotDuration: bookingConfig.slotDuration,
    };
  }

  const openMinutes = toMinutes(open);
  const closeMinutes = toMinutes(close);
  if (closeMinutes <= openMinutes) {
    return {
      day: weekDays[dayIndex],
      closed: true,
      slots: [],
      slotDuration: bookingConfig.slotDuration,
    };
  }

  const slots = [];
  for (
    let cursor = openMinutes;
    cursor + bookingConfig.slotDuration <= closeMinutes;
    cursor += bookingConfig.slotDuration
  ) {
    slots.push(formatMinutesTo24h(cursor));
  }

  return {
    day: weekDays[dayIndex],
    closed: slots.length === 0,
    slots,
    slotDuration: bookingConfig.slotDuration,
  };
};

const getAvailableSlots = async (req, res, next) => {
  try {
    const dateRaw = normalizeString(req.query.date);
    const dubaiDay = getDubaiDayFromIsoDate(dateRaw);
    if (!dubaiDay) {
      const error = new Error("Query parameter 'date' must be in YYYY-MM-DD format");
      error.statusCode = 400;
      throw error;
    }

    const bookingConfig = await loadBookingConfig();
    const targetDate = new Date(Date.UTC(dubaiDay.year, dubaiDay.monthIndex, dubaiDay.day, 12, 0, 0, 0));
    const slotInfo = getSlotsForDate(targetDate, bookingConfig);
    const { startUtc, endUtc } = getDubaiUtcRangeForDate(dubaiDay);

    const booked = await Booking.find({
      preferredDate: { $gte: startUtc, $lt: endUtc },
      status: { $in: ACTIVE_BLOCKING_STATUSES },
    })
      .select("preferredDate")
      .lean();

    const occupiedSlots = new Set();
    for (const booking of booked) {
      const dubaiParts = getDubaiPartsFromUtcDate(booking.preferredDate);
      if (dubaiParts?.isoDate === dubaiDay.isoDate) {
        occupiedSlots.add(dubaiParts.slotLabel);
      }
    }
    const availableSlots = slotInfo.slots.filter((slot) => !occupiedSlots.has(slot));

    res.status(200).json({
      success: true,
      data: {
        closed: slotInfo.closed,
        slots: availableSlots,
      },
    });
  } catch (error) {
    next(error);
  }
};

const createBooking = async (req, res, next) => {
  try {
    const {
      // Frontend fields
      name,
      email,
      model,
      vehicleType,
      vehicleTypeIndex,
      serviceType,
      serviceTypeIndex,
      preferredDateLabel,
      preferredDate: preferredDateInput,
      preferredTime,
      notes,
      recaptchaToken,
    } = req.body || {};

    const recaptchaResult = await verifyRecaptchaToken({
      token: recaptchaToken,
      remoteIp: getClientIp(req),
    });
    if (!recaptchaResult.ok) {
      const error = new Error("reCAPTCHA verification failed");
      error.statusCode = 400;
      throw error;
    }

    const resolvedVehicleType =
      normalizeString(vehicleType) ||
      (Number.isInteger(Number(vehicleTypeIndex)) &&
        vehicleTypes[Number(vehicleTypeIndex)]?.label);

    const resolvedServiceType =
      normalizeString(serviceType) ||
      (Number.isInteger(Number(serviceTypeIndex)) &&
        serviceProtocols[Number(serviceTypeIndex)]?.label);

    const resolvedPreferredTime = normalizeSlotLabel(preferredTime);

    if (!normalizeString(name)) {
      const error = new Error("Customer name is required");
      error.statusCode = 400;
      throw error;
    }
    if (!normalizeString(email)) {
      const error = new Error("Email is required");
      error.statusCode = 400;
      throw error;
    }
    if (!normalizeString(model)) {
      const error = new Error("Vehicle model is required");
      error.statusCode = 400;
      throw error;
    }
    if (!resolvedVehicleType) {
      const error = new Error("Vehicle type is required");
      error.statusCode = 400;
      throw error;
    }
    if (!resolvedServiceType) {
      const error = new Error("Service type is required");
      error.statusCode = 400;
      throw error;
    }
    const dubaiDay = getDubaiDayFromIsoDate(preferredDateInput);
    if (!dubaiDay) {
      const error = new Error("preferredDate must be a valid date in YYYY-MM-DD format");
      error.statusCode = 400;
      throw error;
    }
    const resolvedPreferredDateLabel =
      normalizeString(preferredDateLabel) || `${dubaiDay.dayLabel} ${dubaiDay.day}`;

    const bookingConfig = await loadBookingConfig();
    const targetDate = new Date(Date.UTC(dubaiDay.year, dubaiDay.monthIndex, dubaiDay.day, 12, 0, 0, 0));
    const slotInfo = getSlotsForDate(targetDate, bookingConfig);
    const normalizedRequestedSlot = normalizeSlotLabel(resolvedPreferredTime);

    if (!normalizedRequestedSlot) {
      const error = new Error("Preferred time is required");
      error.statusCode = 400;
      throw error;
    }

    const preferredDate = computePreferredDate({ preferredDateIso: preferredDateInput, timeSlot: normalizedRequestedSlot });
    if (!preferredDate) {
      const error = new Error("Invalid preferred date/time");
      error.statusCode = 400;
      throw error;
    }

    if (slotInfo.closed || !slotInfo.slots.includes(normalizedRequestedSlot)) {
      const error = new Error("Selected time is outside configured working hours");
      error.statusCode = 400;
      throw error;
    }

    const existingBooking = await Booking.findOne({
      preferredDate,
      status: { $in: ACTIVE_BLOCKING_STATUSES },
    })
      .select("_id")
      .lean();

    if (existingBooking) {
      const error = new Error("Selected time slot is already booked");
      error.statusCode = 409;
      throw error;
    }

    const booking = await Booking.create({
      // Schema uses `customerName` with alias `name`
      name: normalizeString(name),
      email: normalizeString(email),

      // Matches frontend selection labels
      vehicleType: resolvedVehicleType,
      serviceType: resolvedServiceType,

      // Schedule details
      preferredDate,
      preferredTime: normalizedRequestedSlot,
      preferredDateLabel: resolvedPreferredDateLabel,
      preferredDay: dubaiDay.dayLabel,
      preferredDateNumber: dubaiDay.day,

      // Frontend `model` input goes into vehicleDetails.model
      vehicleDetails: { model: normalizeString(model) },

      notes: normalizeString(notes),
    });

    res.status(201).json({
      ok: true,
      message: "Booking submitted successfully. We will contact you shortly to confirm your appointment.",
      data: booking,
    });
  } catch (error) {
    if (error?.code === 11000 && error?.keyPattern?.slotKey) {
      error.statusCode = 409;
      error.message = "Selected time slot is already booked";
    }
    if (error?.name === "ValidationError") {
      error.statusCode = 400;
    }
    next(error);
  }
};

module.exports = {
  getAvailableSlots,
  getPublicAvailableSlots: getAvailableSlots,
  createBooking,
};

