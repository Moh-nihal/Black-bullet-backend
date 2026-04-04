const mongoose = require("mongoose");

const ContentPage = require("../models/ContentPage");
require("../models/Blogs");
const Blog = mongoose.model("Blog") || mongoose.model("BlogPost");
const Service = require("../models/Service");
const GalleryItem = require("../models/GalleryItem");

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");
const {
  resolveRequestLocale,
  localizeBlogForPublic,
  localizeServiceForPublic,
} = require("../utils/i18n");

const parsePagination = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

const makeNotFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const getPublicContentByPageKey = async (req, res, next) => {
  try {
    const pageKey = normalizeString(req.params.pageKey);
    const page = await ContentPage.findOne({ pageKey }).lean();

    if (!page) {
      throw makeNotFoundError("Content page not found");
    }

    res.status(200).json({
      success: true,
      data: page.data,
    });
  } catch (error) {
    next(error);
  }
};

const listPublicBlogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = normalizeString(req.query.category);
    const filters = { status: "published" };
    const locale = resolveRequestLocale(req);

    if (category) {
      filters.$or = [{ "category.en": category }, { "category.ar": category }];
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filters).sort({ publishedAt: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      Blog.countDocuments(filters),
    ]);

    const localizedBlogs = blogs.map((blog) => localizeBlogForPublic(blog, locale));

    res.status(200).json({
      success: true,
      data: localizedBlogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPublicBlogBySlugOrId = async (req, res, next) => {
  try {
    const identifier = normalizeString(req.params.slugOrId);
    const filters = { status: "published" };
    const locale = resolveRequestLocale(req);

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      filters.$or = [{ _id: identifier }, { slug: identifier }];
    } else {
      filters.slug = identifier;
    }

    const blog = await Blog.findOne(filters).lean();
    if (!blog) {
      throw makeNotFoundError("Blog not found");
    }

    res.status(200).json({
      success: true,
      data: localizeBlogForPublic(blog, locale),
    });
  } catch (error) {
    next(error);
  }
};

const listPublicServices = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const category = normalizeString(req.query.category);
    const filters = { status: "active" };
    const locale = resolveRequestLocale(req);

    if (category) {
      filters.$or = [{ "category.en": category }, { "category.ar": category }];
    }

    const [services, total] = await Promise.all([
      Service.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Service.countDocuments(filters),
    ]);

    const localizedServices = services.map((service) => localizeServiceForPublic(service, locale));

    res.status(200).json({
      success: true,
      data: localizedServices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

const getPublicServiceBySlugOrId = async (req, res, next) => {
  try {
    const identifier = normalizeString(req.params.idOrSlug);
    const filters = { status: "active" };
    const locale = resolveRequestLocale(req);

    if (mongoose.Types.ObjectId.isValid(identifier)) {
      filters.$or = [{ _id: identifier }, { slug: identifier }];
    } else {
      filters.slug = identifier;
    }

    const service = await Service.findOne(filters).lean();
    if (!service) {
      throw makeNotFoundError("Service not found");
    }

    res.status(200).json({
      success: true,
      data: localizeServiceForPublic(service, locale),
    });
  } catch (error) {
    next(error);
  }
};

const listPublicGalleryItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const type = normalizeString(req.query.type);
    const category = normalizeString(req.query.category);

    const filters = { status: "active" };
    if (type) {
      filters.type = type;
    }
    if (category) {
      filters.category = category;
    }

    const [items, total] = await Promise.all([
      GalleryItem.find(filters).sort({ sortOrder: 1, createdAt: -1 }).skip(skip).limit(limit).lean(),
      GalleryItem.countDocuments(filters),
    ]);

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPublicContentByPageKey,
  listPublicBlogs,
  getPublicBlogBySlugOrId,
  listPublicServices,
  getPublicServiceBySlugOrId,
  listPublicGalleryItems,
};
