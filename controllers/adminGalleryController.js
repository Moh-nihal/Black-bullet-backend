const mongoose = require("mongoose");

const GalleryItem = require("../models/GalleryItem");
const { uploadMediaFile, deleteMediaFile } = require("../services/mediaService");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeNullableString = (value) => {
  const s = normalizeString(value);
  return s || null;
};

const parseTags = (value) => {
  if (Array.isArray(value)) return value.map(normalizeString).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map(normalizeString)
      .filter(Boolean);
  }
  return [];
};

const buildTypeFromMimetype = (mimeType, resourceType) => {
  // `uploadMediaFile` already returns `resourceType` as image/video, so we prefer that.
  if (resourceType === "image" || resourceType === "video") return resourceType;
  return null;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const listGalleryItems = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const status = normalizeString(req.query.status);
    const category = normalizeString(req.query.category);
    const type = normalizeString(req.query.type);
    const search = normalizeString(req.query.search);

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (type) filters.type = type;

    if (search) {
      const safeSearch = escapeRegex(search);
      filters.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { category: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { altText: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      GalleryItem.find(filters)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      GalleryItem.countDocuments(filters),
    ]);

    res.status(200).json({
      ok: true,
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

const createGalleryItem = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded");
      error.statusCode = 400;
      throw error;
    }

    const title = normalizeString(req.body?.title);
    if (!title) {
      const error = new Error("title is required");
      error.statusCode = 400;
      throw error;
    }

    const uploadResult = await uploadMediaFile(req.file);

    const type = buildTypeFromMimetype(req.file.mimetype, uploadResult.resourceType);
    if (!type) {
      const error = new Error("Failed to infer gallery item type");
      error.statusCode = 400;
      throw error;
    }

    const thumbnail = type === "image" ? uploadResult.url : undefined;

    const payload = {
      title,
      type,
      url: uploadResult.url,
      width: uploadResult.width || null,
      height: uploadResult.height || null,
      thumbnail,
      publicId: uploadResult.publicId,
      category: normalizeNullableString(req.body?.category),
      description: normalizeNullableString(req.body?.description),
      altText: normalizeNullableString(req.body?.altText),
      status: normalizeString(req.body?.status) || undefined,
      sortOrder:
        req.body?.sortOrder !== undefined && req.body?.sortOrder !== ""
          ? Number(req.body.sortOrder)
          : undefined,
    };

    if (Number.isNaN(payload.sortOrder)) {
      const error = new Error("sortOrder must be a valid number");
      error.statusCode = 400;
      throw error;
    }

    const item = await GalleryItem.create(payload);

    res.status(201).json({
      ok: true,
      data: item,
    });
  } catch (error) {
    next(error);
  }
};

const deleteGalleryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid gallery item id");
      error.statusCode = 400;
      throw error;
    }

    const item = await GalleryItem.findById(id);
    if (!item) {
      const error = new Error("Gallery item not found");
      error.statusCode = 404;
      throw error;
    }

    const publicId = item.publicId;
    const resourceType = item.type;

    await GalleryItem.deleteOne({ _id: item._id });

    if (publicId) {
      await deleteMediaFile({ publicId, resourceType });
    }

    res.status(200).json({
      ok: true,
      message: "Gallery item deleted",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listGalleryItems,
  createGalleryItem,
  deleteGalleryItem,
};

