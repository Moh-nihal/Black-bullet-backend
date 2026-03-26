const ContentPage = require("../models/ContentPage");

const ALLOWED_PAGE_KEYS = new Set(["home", "services", "gallery", "blog", "settings"]);

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;

const assertValidPageKey = (pageKey) => {
  const normalized = normalizeString(pageKey);
  if (!ALLOWED_PAGE_KEYS.has(normalized)) {
    const error = new Error("Invalid pageKey");
    error.statusCode = 400;
    throw error;
  }
  return normalized;
};

const shouldUseEnvelope = (req) => String(req.query?.format || "").toLowerCase() === "envelope";

const getContentByPageKey = async (req, res, next) => {
  try {
    const pageKey = assertValidPageKey(req.params.pageKey);

    const page = await ContentPage.findOne({ pageKey }).lean();
    if (!page) {
      const error = new Error("Content page not found");
      error.statusCode = 404;
      throw error;
    }

    if (shouldUseEnvelope(req)) {
      res.status(200).json({
        ok: true,
        pageKey,
        data: page.data,
      });
      return;
    }

    res.status(200).json(page.data);
  } catch (error) {
    next(error);
  }
};

const upsertContentByPageKey = async (req, res, next) => {
  try {
    const pageKey = assertValidPageKey(req.params.pageKey);

    if (!isPlainObject(req.body)) {
      const error = new Error("Request body must be a JSON object");
      error.statusCode = 400;
      throw error;
    }

    const payload = {
      data: req.body,
      updatedBy: req.admin?._id || null,
    };

    const page = await ContentPage.findOneAndUpdate(
      { pageKey },
      { $set: payload, $setOnInsert: { pageKey } },
      { returnDocument: "after", upsert: true, runValidators: true }
    );

    if (shouldUseEnvelope(req)) {
      res.status(200).json({
        ok: true,
        message: "Content saved",
        pageKey,
        data: page.data,
      });
      return;
    }

    res.status(200).json(page.data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getContentByPageKey,
  upsertContentByPageKey,
};
