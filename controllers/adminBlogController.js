const mongoose = require("mongoose");

const { deleteMediaFile } = require("../services/mediaService");
const { normalizeBilingualField, assertBilingualRequired } = require("../utils/i18n");
require("../models/Blogs");

const Blog = mongoose.model("Blog") || mongoose.model("BlogPost");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeNullableString = (value) => {
  if (value === null || value === undefined) return null;
  const s = normalizeString(value);
  return s ? s : null;
};

const slugify = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const ALLOWED_STATUSES = new Set(["draft", "published", "archived"]);

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((t) => normalizeString(t)).filter(Boolean))].map((t) => t.toLowerCase());
  }

  if (typeof value === "string") {
    return [...new Set(value.split(",").map((t) => normalizeString(t)).filter(Boolean))].map((t) =>
      t.toLowerCase()
    );
  }

  return [];
};

const readLocalizedField = (value, fieldName) => {
  const normalized = normalizeBilingualField(value, { fieldName });
  if (!normalized.ok) {
    const error = normalized.error || new Error(`${fieldName} is invalid`);
    error.statusCode = 400;
    throw error;
  }
  return normalized.value;
};

const blogTitleSlugSource = (title) =>
  title && (normalizeString(title.en) || normalizeString(title.ar) || "");

const extractCloudinaryPublicId = (value) => {
  if (typeof value !== "string") return null;

  const url = value.trim();
  if (!url) return null;
  if (!url.includes("/upload/")) return null;

  const withoutQuery = url.split("?")[0];
  const uploadSplit = withoutQuery.split("/upload/");
  if (uploadSplit.length < 2) return null;

  const rightPart = uploadSplit[1];
  const segments = rightPart.split("/");
  if (segments.length === 0) return null;

  const maybeVersionSegment = /^v\d+$/.test(segments[0]) ? 1 : 0;
  const publicIdPath = segments.slice(maybeVersionSegment).join("/");
  if (!publicIdPath) return null;

  return publicIdPath.replace(/\.[^/.]+$/, "");
};

const deleteCloudinaryByUrl = async (url) => {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  await deleteMediaFile({ publicId, resourceType: "image" });
};

const listBlogs = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const status = normalizeString(req.query.status);
    const category = normalizeString(req.query.category);
    const search = normalizeString(req.query.search);

    const filters = {};
    if (status) filters.status = status;

    const andParts = [];
    if (category) {
      andParts.push({ $or: [{ "category.en": category }, { "category.ar": category }] });
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      andParts.push({
        $or: [
        { "title.en": { $regex: safeSearch, $options: "i" } },
        { "title.ar": { $regex: safeSearch, $options: "i" } },
        { slug: { $regex: safeSearch, $options: "i" } },
        { "shortDesc.en": { $regex: safeSearch, $options: "i" } },
        { "shortDesc.ar": { $regex: safeSearch, $options: "i" } },
        ],
      });
    }

    if (andParts.length === 1) {
      Object.assign(filters, andParts[0]);
    } else if (andParts.length > 1) {
      filters.$and = andParts;
    }

    const [blogs, total] = await Promise.all([
      Blog.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Blog.countDocuments(filters),
    ]);

    res.status(200).json({
      ok: true,
      data: blogs,
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

const createBlog = async (req, res, next) => {
  try {
    const title = readLocalizedField(req.body?.title, "title");
    const content = readLocalizedField(req.body?.content, "content");
    assertBilingualRequired(title, { fieldName: "title" });
    assertBilingualRequired(content, { fieldName: "content" });

    const slugInput = normalizeNullableString(req.body?.slug);
    const slug = slugInput ? slugify(slugInput) : slugify(blogTitleSlugSource(title));
    if (!slug) {
      const error = new Error("slug is required");
      error.statusCode = 400;
      throw error;
    }

    const status = normalizeString(req.body?.status) || "draft";
    if (status && !ALLOWED_STATUSES.has(status)) {
      const error = new Error("Invalid status");
      error.statusCode = 400;
      throw error;
    }

    const publishedAtRaw = req.body?.publishedAt;
    const publishedAt =
      status === "published"
        ? publishedAtRaw
          ? new Date(publishedAtRaw)
          : new Date()
        : publishedAtRaw
          ? new Date(publishedAtRaw)
          : null;

    if (publishedAt && Number.isNaN(publishedAt.getTime())) {
      const error = new Error("publishedAt must be a valid date");
      error.statusCode = 400;
      throw error;
    }

    const existing = await Blog.findOne({ slug }).lean();
    if (existing) {
      const error = new Error("Blog slug already exists");
      error.statusCode = 409;
      throw error;
    }

    const payload = {
      title,
      slug,
      content,
      author: normalizeNullableString(req.body?.author),
      tags: parseTags(req.body?.tags),
      image: normalizeNullableString(req.body?.image),
      ogImage: normalizeNullableString(req.body?.ogImage),
      status,
      publishedAt,
      views: Object.prototype.hasOwnProperty.call(req.body, "views") ? Number(req.body.views) : undefined,
    };

    if (Object.prototype.hasOwnProperty.call(req.body, "category")) {
      payload.category = readLocalizedField(req.body.category, "category");
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "shortDesc")) {
      payload.shortDesc = readLocalizedField(req.body.shortDesc, "shortDesc");
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "metaTitle")) {
      payload.metaTitle = readLocalizedField(req.body.metaTitle, "metaTitle");
    }
    if (Object.prototype.hasOwnProperty.call(req.body, "metaDescription")) {
      payload.metaDescription = readLocalizedField(req.body.metaDescription, "metaDescription");
    }

    if (payload.views !== undefined && Number.isNaN(payload.views)) {
      const error = new Error("views must be a number");
      error.statusCode = 400;
      throw error;
    }

    const blog = await Blog.create(payload);

    res.status(201).json({
      ok: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

const getBlogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid blog id");
      error.statusCode = 400;
      throw error;
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      const error = new Error("Blog not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ok: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

const updateBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid blog id");
      error.statusCode = 400;
      throw error;
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      const error = new Error("Blog not found");
      error.statusCode = 404;
      throw error;
    }

    const hasOwn = (key) => Object.prototype.hasOwnProperty.call(req.body, key);

    const nextTitle = hasOwn("title") ? readLocalizedField(req.body.title, "title") : undefined;
    const nextSlugInput = hasOwn("slug") ? normalizeNullableString(req.body.slug) : undefined;

    const titleWillChange =
      nextTitle &&
      (normalizeString(nextTitle.en) !== normalizeString(blog.title?.en) ||
        normalizeString(nextTitle.ar) !== normalizeString(blog.title?.ar));

    let nextSlug = blog.slug;
    const slugIsMissingOrEmpty = !nextSlugInput;
    if (titleWillChange && slugIsMissingOrEmpty) {
      nextSlug = slugify(blogTitleSlugSource(nextTitle));
    }
    if (typeof nextSlugInput === "string" && nextSlugInput) {
      nextSlug = slugify(nextSlugInput);
    }

    if (!nextSlug) {
      const error = new Error("slug is required");
      error.statusCode = 400;
      throw error;
    }

    if (nextSlug !== blog.slug) {
      const existing = await Blog.findOne({ slug: nextSlug, _id: { $ne: blog._id } }).lean();
      if (existing) {
        const error = new Error("Blog slug already exists");
        error.statusCode = 409;
        throw error;
      }
    }

    const nextStatus = hasOwn("status") ? normalizeNullableString(req.body.status) : undefined;
    if (nextStatus && nextStatus !== "" && !ALLOWED_STATUSES.has(nextStatus)) {
      const error = new Error("Invalid status");
      error.statusCode = 400;
      throw error;
    }

    if (hasOwn("title")) {
      assertBilingualRequired(nextTitle, { fieldName: "title" });
      blog.title = nextTitle;
    }
    blog.slug = nextSlug;

    if (hasOwn("category")) blog.category = readLocalizedField(req.body.category, "category");
    if (hasOwn("shortDesc")) blog.shortDesc = readLocalizedField(req.body.shortDesc, "shortDesc");
    if (hasOwn("content")) {
      const nextContent = readLocalizedField(req.body.content, "content");
      assertBilingualRequired(nextContent, { fieldName: "content" });
      blog.content = nextContent;
    }
    if (hasOwn("author")) blog.author = normalizeNullableString(req.body.author);

    if (hasOwn("tags")) blog.tags = parseTags(req.body.tags);

    if (hasOwn("metaTitle")) blog.metaTitle = readLocalizedField(req.body.metaTitle, "metaTitle");
    if (hasOwn("metaDescription")) blog.metaDescription = readLocalizedField(req.body.metaDescription, "metaDescription");

    if (hasOwn("status")) {
      blog.status = nextStatus || "draft";
    }

    const statusToCheck = hasOwn("status") ? blog.status : blog.status;
    if (statusToCheck === "published") {
      if (hasOwn("publishedAt")) {
        const publishedAt = req.body.publishedAt ? new Date(req.body.publishedAt) : null;
        if (publishedAt && Number.isNaN(publishedAt.getTime())) {
          const error = new Error("publishedAt must be a valid date");
          error.statusCode = 400;
          throw error;
        }
        blog.publishedAt = publishedAt;
      } else if (blog.status === "published" && !blog.publishedAt) {
        blog.publishedAt = new Date();
      }
    }

    if (hasOwn("image")) {
      const nextImage = normalizeNullableString(req.body.image);
      const prevImage = blog.image;
      const imageChanged = nextImage !== blog.image;

      if (imageChanged && prevImage) {
        await deleteCloudinaryByUrl(prevImage);
      }

      blog.image = nextImage;
    }

    if (hasOwn("ogImage")) {
      const nextOgImage = normalizeNullableString(req.body.ogImage);
      const prevOgImage = blog.ogImage;
      const ogChanged = nextOgImage !== blog.ogImage;

      if (ogChanged && prevOgImage) {
        await deleteCloudinaryByUrl(prevOgImage);
      }

      blog.ogImage = nextOgImage;
    }

    await blog.save();

    res.status(200).json({
      ok: true,
      data: blog,
    });
  } catch (error) {
    next(error);
  }
};

const deleteBlog = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid blog id");
      error.statusCode = 400;
      throw error;
    }

    const blog = await Blog.findById(id);
    if (!blog) {
      const error = new Error("Blog not found");
      error.statusCode = 404;
      throw error;
    }

    const imageUrl = blog.image;
    const ogImageUrl = blog.ogImage;

    await Blog.deleteOne({ _id: blog._id });

    if (imageUrl) {
      await deleteCloudinaryByUrl(imageUrl);
    }

    if (ogImageUrl) {
      await deleteCloudinaryByUrl(ogImageUrl);
    }

    res.status(200).json({
      ok: true,
      message: "Blog deleted",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listBlogs,
  createBlog,
  getBlogById,
  updateBlog,
  deleteBlog,
};

