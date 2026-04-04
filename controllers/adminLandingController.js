const mongoose = require("mongoose");
const LandingPage = require("../models/LandingPage");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const listLandingPages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status ? normalizeString(req.query.status) : null;
    const search = req.query.search ? normalizeString(req.query.search) : null;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      const searchRegex = new RegExp(search, "i");
      filter.$or = [{ title: searchRegex }, { slug: searchRegex }];
    }

    const total = await LandingPage.countDocuments(filter);
    const pages = await LandingPage.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({
      ok: true,
      data: pages,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getLandingPage = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid id");
      error.statusCode = 400;
      throw error;
    }

    const page = await LandingPage.findById(id).lean();
    if (!page) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ok: true,
      data: page,
    });
  } catch (error) {
    next(error);
  }
};

const createLandingPage = async (req, res, next) => {
  try {
    const { title, slug, status, utmSource, utmCampaign, metaTitle, metaDescription, variants } = req.body;

    if (!normalizeString(title)) {
      const error = new Error("Title is required");
      error.statusCode = 400;
      throw error;
    }

    if (!normalizeString(slug)) {
      const error = new Error("Slug is required");
      error.statusCode = 400;
      throw error;
    }

    const exists = await LandingPage.exists({ slug: normalizeString(slug).toLowerCase() });
    if (exists) {
      const error = new Error("Landing page with this slug already exists");
      error.statusCode = 409;
      throw error;
    }

    const safeVariants = Array.isArray(variants)
      ? variants.map(v => ({
          name: v.name || "Variant",
          weight: Number(v.weight) >= 0 ? Number(v.weight) : 100,
          content: v.content || {},
          analytics: {
            views: 0,
            conversions: { whatsapp: 0, call: 0, form: 0 },
            devices: { desktop: 0, mobile: 0, tablet: 0 },
            dailyMetrics: []
          }
        }))
      : [];

    const page = await LandingPage.create({
      title: normalizeString(title),
      slug: normalizeString(slug).toLowerCase(),
      status: status || "draft",
      utmSource: normalizeString(utmSource),
      utmCampaign: normalizeString(utmCampaign),
      metaTitle: metaTitle || {},
      metaDescription: metaDescription || {},
      variants: safeVariants
    });

    res.status(201).json({
      ok: true,
      data: page,
      message: "Landing page created successfully",
    });
  } catch (error) {
    next(error);
  }
};

const updateLandingPage = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid id");
      error.statusCode = 400;
      throw error;
    }

    const { title, slug, status, utmSource, utmCampaign, metaTitle, metaDescription, variants } = req.body;

    const page = await LandingPage.findById(id);
    if (!page) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    if (slug && normalizeString(slug).toLowerCase() !== page.slug) {
      const exists = await LandingPage.exists({ slug: normalizeString(slug).toLowerCase() });
      if (exists) {
        const error = new Error("Landing page with this slug already exists");
        error.statusCode = 409;
        throw error;
      }
      page.slug = normalizeString(slug).toLowerCase();
    }

    if (title !== undefined) page.title = normalizeString(title);
    if (status !== undefined) page.status = status;
    if (utmSource !== undefined) page.utmSource = normalizeString(utmSource);
    if (utmCampaign !== undefined) page.utmCampaign = normalizeString(utmCampaign);
    if (metaTitle !== undefined) page.metaTitle = metaTitle;
    if (metaDescription !== undefined) page.metaDescription = metaDescription;

    if (Array.isArray(variants)) {
      const newVariants = variants.map((incomingVariant) => {
        // Find existing variant to preserve analytics
        const existingVariant = incomingVariant._id 
          ? page.variants.id(incomingVariant._id) 
          : null;

        return {
          _id: existingVariant ? existingVariant._id : new mongoose.Types.ObjectId(),
          name: incomingVariant.name || "Variant",
          weight: Number(incomingVariant.weight) >= 0 ? Number(incomingVariant.weight) : 100,
          content: incomingVariant.content || {},
          analytics: existingVariant ? existingVariant.analytics : {
            views: 0,
            conversions: { whatsapp: 0, call: 0, form: 0 },
            devices: { desktop: 0, mobile: 0, tablet: 0 },
            dailyMetrics: []
          }
        };
      });
      page.variants = newVariants;
    }

    await page.save();

    res.status(200).json({
      ok: true,
      data: page,
      message: "Landing page updated successfully",
    });
  } catch (error) {
    next(error);
  }
};

const deleteLandingPage = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid id");
      error.statusCode = 400;
      throw error;
    }

    const page = await LandingPage.findByIdAndDelete(id);
    if (!page) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ok: true,
      message: "Landing page deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

const getLandingAnalytics = async (req, res, next) => {
  try {
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error("Invalid id");
      error.statusCode = 400;
      throw error;
    }

    const page = await LandingPage.findById(id).lean();
    if (!page) {
      const error = new Error("Landing page not found");
      error.statusCode = 404;
      throw error;
    }

    // Aggregate overall metrics from all variants
    let totalViews = 0;
    let totalConversions = { whatsapp: 0, call: 0, form: 0 };
    let totalDevices = { desktop: 0, mobile: 0, tablet: 0 };

    page.variants.forEach((v) => {
      totalViews += v.analytics?.views || 0;
      if (v.analytics?.conversions) {
        totalConversions.whatsapp += v.analytics.conversions.whatsapp || 0;
        totalConversions.call += v.analytics.conversions.call || 0;
        totalConversions.form += v.analytics.conversions.form || 0;
      }
      if (v.analytics?.devices) {
        totalDevices.desktop += v.analytics.devices.desktop || 0;
        totalDevices.mobile += v.analytics.devices.mobile || 0;
        totalDevices.tablet += v.analytics.devices.tablet || 0;
      }
    });

    const totalActions = totalConversions.whatsapp + totalConversions.call + totalConversions.form;
    const overallConversionRate = totalViews > 0 ? ((totalActions / totalViews) * 100).toFixed(2) : 0;

    res.status(200).json({
      ok: true,
      data: {
        _id: page._id,
        slug: page.slug,
        title: page.title,
        status: page.status,
        overall: {
          totalViews,
          totalActions,
          conversionRate: Number(overallConversionRate),
          conversions: totalConversions,
          devices: totalDevices,
        },
        variants: page.variants.map((v) => {
          const vTotalActions = 
            (v.analytics?.conversions?.whatsapp || 0) + 
            (v.analytics?.conversions?.call || 0) + 
            (v.analytics?.conversions?.form || 0);
          const vCR = v.analytics?.views > 0 ? ((vTotalActions / v.analytics.views) * 100).toFixed(2) : 0;
          return {
            _id: v._id,
            name: v.name,
            weight: v.weight,
            views: v.analytics?.views || 0,
            conversions: v.analytics?.conversions || { whatsapp: 0, call: 0, form: 0 },
            totalActions: vTotalActions,
            conversionRate: Number(vCR),
            dailyMetrics: v.analytics?.dailyMetrics || []
          };
        }),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
  getLandingAnalytics,
};
