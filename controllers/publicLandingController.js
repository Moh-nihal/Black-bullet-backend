const mongoose = require("mongoose");

const LandingLead = require("../models/LandingLead");
const LandingPage = require("../models/LandingPage");
const { verifyRecaptchaToken } = require("../utils/recaptcha");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const VALID_CONVERSION_TYPES = new Set(["whatsapp", "call", "form"]);

const getClientIp = (req) => {
  const forwarded = normalizeString(req.headers["x-forwarded-for"]);
  if (forwarded) return normalizeString(forwarded.split(",")[0]);
  return normalizeString(req.ip || req.socket?.remoteAddress);
};

const detectDeviceType = (userAgent) => {
  const ua = normalizeString(userAgent).toLowerCase();
  if (!ua) return "desktop";
  if (ua.includes("ipad") || ua.includes("tablet")) return "tablet";
  if (ua.includes("mobi") || ua.includes("android") || ua.includes("iphone")) return "mobile";
  return "desktop";
};

const pickVariant = (variants) => {
  const list = Array.isArray(variants) ? variants : [];
  if (list.length === 0) return null;

  const weighted = list
    .map((variant) => ({ variant, weight: Number(variant?.weight) || 0 }))
    .filter((item) => item.weight > 0);

  if (weighted.length === 0) return list[0];

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;
  for (const item of weighted) {
    cursor -= item.weight;
    if (cursor <= 0) return item.variant;
  }

  return weighted[weighted.length - 1].variant;
};

const sameUtcDate = (a, b) =>
  a instanceof Date &&
  b instanceof Date &&
  a.getUTCFullYear() === b.getUTCFullYear() &&
  a.getUTCMonth() === b.getUTCMonth() &&
  a.getUTCDate() === b.getUTCDate();

const ensureDailyMetric = (dailyMetrics) => {
  const now = new Date();
  const list = Array.isArray(dailyMetrics) ? dailyMetrics : [];
  let item = list.find((entry) => sameUtcDate(entry?.date, now));

  if (!item) {
    item = {
      date: now,
      views: 0,
      conversions: { whatsapp: 0, call: 0, form: 0 },
    };
    list.push(item);
  }

  return { list, item };
};

const getPublicLandingBySlug = async (req, res, next) => {
  try {
    const slug = normalizeString(req.params.slug).toLowerCase();
    const landing = await LandingPage.findOne({ slug, status: "active" });

    if (!landing) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    const variant = pickVariant(landing.variants);
    if (!variant) {
      const error = new Error("Landing page has no variants");
      error.statusCode = 400;
      throw error;
    }

    const deviceType = detectDeviceType(req.headers["user-agent"]);
    variant.analytics = variant.analytics || {};
    variant.analytics.views = Number(variant.analytics.views || 0) + 1;
    variant.analytics.devices = variant.analytics.devices || { desktop: 0, mobile: 0, tablet: 0 };
    variant.analytics.devices[deviceType] = Number(variant.analytics.devices[deviceType] || 0) + 1;

    const { list, item } = ensureDailyMetric(variant.analytics.dailyMetrics);
    variant.analytics.dailyMetrics = list;
    item.views = Number(item.views || 0) + 1;

    await landing.save();

    res.status(200).json({
      ok: true,
      data: {
        landingPageId: landing._id,
        slug: landing.slug,
        title: landing.title,
        metaTitle: landing.metaTitle || "",
        metaDescription: landing.metaDescription || "",
        variant: {
          _id: variant._id,
          name: variant.name,
          content: variant.content || {},
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// const registerLandingConversion = async (req, res, next) => {
//   try {
//     const slug = normalizeString(req.params.slug).toLowerCase();
//     const conversionType = normalizeString(req.body?.type || req.body?.conversionType).toLowerCase();
//     const variantId = normalizeString(req.body?.variantId);

//     if (!VALID_CONVERSION_TYPES.has(conversionType)) {
//       const error = new Error("Invalid conversion type");
//       error.statusCode = 400;
//       throw error;
//     }
//     if (!mongoose.Types.ObjectId.isValid(variantId)) {
//       const error = new Error("variantId is required");
//       error.statusCode = 400;
//       throw error;
//     }

//     const landing = await LandingPage.findOne({ slug, status: "active" });
//     if (!landing) {
//       const error = new Error("Landing page not found");
//       error.statusCode = 404;
//       throw error;
//     }

//     const variant = landing.variants.id(variantId);
//     if (!variant) {
//       const error = new Error("Variant not found");
//       error.statusCode = 404;
//       throw error;
//     }

//     variant.analytics = variant.analytics || {};
//     variant.analytics.conversions = variant.analytics.conversions || { whatsapp: 0, call: 0, form: 0 };
//     variant.analytics.conversions[conversionType] =
//       Number(variant.analytics.conversions[conversionType] || 0) + 1;

//     const { list, item } = ensureDailyMetric(variant.analytics.dailyMetrics);
//     variant.analytics.dailyMetrics = list;
//     item.conversions = item.conversions || { whatsapp: 0, call: 0, form: 0 };
//     item.conversions[conversionType] = Number(item.conversions[conversionType] || 0) + 1;

//     await landing.save();

//     res.status(200).json({
//       ok: true,
//       message: "Conversion tracked",
//     });
//   } catch (error) {
//     next(error);
//   }
// };

const registerLandingConversion = async (req, res, next) => {
  try {
    const slug = normalizeString(req.params.slug).toLowerCase();
    const conversionType = normalizeString(req.body?.type || req.body?.conversionType).toLowerCase();
    const variantId = normalizeString(req.body?.variantId);

    if (!VALID_CONVERSION_TYPES.has(conversionType)) {
      const error = new Error("Invalid conversion type");
      error.statusCode = 400;
      throw error;
    }

    if (!mongoose.Types.ObjectId.isValid(variantId)) {
      const error = new Error("variantId is required");
      error.statusCode = 400;
      throw error;
    }

    const landing = await LandingPage.findOne({ slug, status: "active" });

    if (!landing) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    // ✅ FIXED HERE
    const variant = landing.variants.find(
      (v) => v._id.toString() === variantId.toString()
    );

    if (!variant) {
      const error = new Error("Variant not found");
      error.statusCode = 404;
      throw error;
    }

    variant.analytics = variant.analytics || {};
    variant.analytics.conversions = variant.analytics.conversions || {
      whatsapp: 0,
      call: 0,
      form: 0,
    };

    variant.analytics.conversions[conversionType] =
      Number(variant.analytics.conversions[conversionType] || 0) + 1;

    const { list, item } = ensureDailyMetric(variant.analytics.dailyMetrics);
    variant.analytics.dailyMetrics = list;

    item.conversions = item.conversions || {
      whatsapp: 0,
      call: 0,
      form: 0,
    };

    item.conversions[conversionType] =
      Number(item.conversions[conversionType] || 0) + 1;

    await landing.save();

    res.status(200).json({
      ok: true,
      message: "Conversion tracked",
    });
  } catch (error) {
    next(error);
  }
};
const createLandingLead = async (req, res, next) => {
  try {
    const slug = normalizeString(req.params.slug).toLowerCase();
    const {
      name,
      phone,
      vehicleModel,
      message,
      variantId,
      recaptchaToken,
    } = req.body || {};

    if (!normalizeString(name)) {
      const error = new Error("Name is required");
      error.statusCode = 400;
      throw error;
    }
    if (!normalizeString(phone)) {
      const error = new Error("Phone is required");
      error.statusCode = 400;
      throw error;
    }
    if (!mongoose.Types.ObjectId.isValid(normalizeString(variantId))) {
      const error = new Error("variantId is required");
      error.statusCode = 400;
      throw error;
    }

    const recaptchaResult = await verifyRecaptchaToken({
      token: recaptchaToken,
      remoteIp: getClientIp(req),
    });
    if (!recaptchaResult.ok) {
      const error = new Error("reCAPTCHA verification failed");
      error.statusCode = 400;
      throw error;
    }

    const landing = await LandingPage.findOne({ slug, status: "active" });
    if (!landing) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    const variant = landing.variants.id(variantId);
    if (!variant) {
      const error = new Error("Variant not found");
      error.statusCode = 404;
      throw error;
    }

    const lead = await LandingLead.create({
      name: normalizeString(name),
      phone: normalizeString(phone),
      vehicleModel: normalizeString(vehicleModel),
      message: normalizeString(message),
      landingPageId: landing._id,
      variantId: variant._id,
    });

    variant.analytics = variant.analytics || {};
    variant.analytics.conversions = variant.analytics.conversions || { whatsapp: 0, call: 0, form: 0 };
    variant.analytics.conversions.form = Number(variant.analytics.conversions.form || 0) + 1;
    const { list, item } = ensureDailyMetric(variant.analytics.dailyMetrics);
    variant.analytics.dailyMetrics = list;
    item.conversions = item.conversions || { whatsapp: 0, call: 0, form: 0 };
    item.conversions.form = Number(item.conversions.form || 0) + 1;
    await landing.save();

    res.status(201).json({
      ok: true,
      message: "Lead submitted successfully",
      data: {
        id: lead._id,
        status: lead.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicLandingBySlug,
  registerLandingConversion,
  createLandingLead,
};
