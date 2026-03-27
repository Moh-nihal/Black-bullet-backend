const mongoose = require("mongoose");

const Service = require("../models/Service");
const { deleteMediaFile } = require("../services/mediaService");

const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeString = (value) => (typeof value === "string" ? value.trim() : "");

const slugify = (value) =>
  normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const normalizeStringArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => normalizeString(item)).filter(Boolean);
};

const extractCloudinaryPublicId = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const url = value.trim();
  if (!url) {
    return null;
  }

  if (!url.includes("/upload/")) {
    return null;
  }

  const withoutQuery = url.split("?")[0];
  const uploadSplit = withoutQuery.split("/upload/");
  if (uploadSplit.length < 2) {
    return null;
  }

  const rightPart = uploadSplit[1];
  const segments = rightPart.split("/");
  if (segments.length === 0) {
    return null;
  }

  const maybeVersionSegment = /^v\d+$/.test(segments[0]) ? 1 : 0;
  const publicIdPath = segments.slice(maybeVersionSegment).join("/");
  if (!publicIdPath) {
    return null;
  }

  return publicIdPath.replace(/\.[^/.]+$/, "");
};

const normalizeImages = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const urls = value
    .map((item) => {
      if (typeof item === "string") {
        return normalizeString(item);
      }

      if (item && typeof item === "object") {
        return normalizeString(item.url);
      }

      return "";
    })
    .filter(Boolean);

  return [...new Set(urls)];
};

const normalizeImagePublicIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value.map((item) => normalizeString(item)).filter(Boolean);
  return [...new Set(ids)];
};

const collectPublicIdsForCleanup = ({ explicitPublicIds = [], imageUrls = [] }) => {
  const derivedPublicIds = imageUrls.map(extractCloudinaryPublicId).filter(Boolean);
  return [...new Set([...explicitPublicIds, ...derivedPublicIds])];
};

const deleteCloudinaryAssets = async (publicIds) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) {
    return;
  }

  await Promise.all(
    publicIds.map((publicId) =>
      deleteMediaFile({
        publicId,
        resourceType: "image",
      })
    )
  );
};

const buildServicePayload = (body, { partial = false } = {}) => {
  const payload = {};

  const title = normalizeString(body.title);
  const slugInput = normalizeString(body.slug);
  const description = normalizeString(body.description);
  const category = normalizeString(body.category);
  const status = normalizeString(body.status);
  const metaTitle = normalizeString(body.metaTitle);
  const metaDescription = normalizeString(body.metaDescription);
  const features = normalizeStringArray(body.features);
  const metaKeywords = normalizeStringArray(body.metaKeywords);
  const images = normalizeImages(body.images);

  if (!partial || title) payload.title = title;
  if (!partial || slugInput || title) payload.slug = slugify(slugInput || title);
  if (!partial || description) payload.description = description;
  if (!partial || category) payload.category = category;
  if (!partial || status) payload.status = status;
  if (!partial || metaTitle) payload.metaTitle = metaTitle;
  if (!partial || metaDescription) payload.metaDescription = metaDescription;
  if (!partial || features.length > 0) payload.features = features;
  if (!partial || metaKeywords.length > 0) payload.metaKeywords = metaKeywords;
  if (!partial || images.length > 0 || Array.isArray(body.images)) payload.images = images;

  if (Object.prototype.hasOwnProperty.call(body, "price")) {
    payload.price = Number(body.price);
  } else if (!partial) {
    payload.price = 0;
  }

  return payload;
};

const listServices = async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const status = normalizeString(req.query.status);
    const category = normalizeString(req.query.category);
    const search = normalizeString(req.query.search);

    const filters = {};
    if (status) filters.status = status;
    if (category) filters.category = category;
    if (search) {
      const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filters.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { slug: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const [services, total] = await Promise.all([
      Service.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Service.countDocuments(filters),
    ]);

    res.status(200).json({
      ok: true,
      data: services,
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

const createService = async (req, res, next) => {
  try {
    const payload = buildServicePayload(req.body, { partial: false });

    if (!payload.title) {
      const error = new Error("title is required");
      error.statusCode = 400;
      throw error;
    }

    if (!payload.slug) {
      const error = new Error("slug is required");
      error.statusCode = 400;
      throw error;
    }

    if (Number.isNaN(payload.price)) {
      const error = new Error("price must be a valid number");
      error.statusCode = 400;
      throw error;
    }

    const existing = await Service.findOne({ slug: payload.slug }).lean();
    if (existing) {
      const error = new Error("Service slug already exists");
      error.statusCode = 409;
      throw error;
    }

    const service = await Service.create(payload);

    res.status(201).json({
      ok: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

const getServiceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid service id");
      error.statusCode = 400;
      throw error;
    }

    const service = await Service.findById(id);
    if (!service) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    res.status(200).json({
      ok: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

const updateService = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid service id");
      error.statusCode = 400;
      throw error;
    }

    const service = await Service.findById(id);
    if (!service) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    const payload = buildServicePayload(req.body, { partial: true });
    if (Object.keys(payload).length === 0) {
      const error = new Error("No valid fields provided for update");
      error.statusCode = 400;
      throw error;
    }

    if (Object.prototype.hasOwnProperty.call(payload, "price") && Number.isNaN(payload.price)) {
      const error = new Error("price must be a valid number");
      error.statusCode = 400;
      throw error;
    }

    if (payload.slug) {
      const existingWithSlug = await Service.findOne({
        slug: payload.slug,
        _id: { $ne: service._id },
      }).lean();

      if (existingWithSlug) {
        const error = new Error("Service slug already exists");
        error.statusCode = 409;
        throw error;
      }
    }

    Object.assign(service, payload);
    await service.save();

    const explicitPublicIds = normalizeImagePublicIds(req.body.removedImagePublicIds);
    const previousImages = normalizeImages(req.body.previousImages);
    
    // Only delete images that were in previousImages but are NO LONGER in payload.images
    const updatedImages = payload.images || service.images || [];
    const removedImages = previousImages.filter(img => !updatedImages.includes(img));

    const publicIdsToDelete = collectPublicIdsForCleanup({
      explicitPublicIds,
      imageUrls: removedImages,
    });

    await deleteCloudinaryAssets(publicIdsToDelete);

    res.status(200).json({
      ok: true,
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

const deleteService = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      const error = new Error("Invalid service id");
      error.statusCode = 400;
      throw error;
    }

    const service = await Service.findById(id);
    if (!service) {
      const error = new Error("Service not found");
      error.statusCode = 404;
      throw error;
    }

    const explicitPublicIds = normalizeImagePublicIds(req.body?.imagePublicIds);
    const imageUrls = Array.isArray(service.images) ? service.images : [];
    const publicIdsToDelete = collectPublicIdsForCleanup({
      explicitPublicIds,
      imageUrls,
    });

    await Service.deleteOne({ _id: service._id });
    await deleteCloudinaryAssets(publicIdsToDelete);

    res.status(200).json({
      ok: true,
      message: "Service deleted",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listServices,
  createService,
  getServiceById,
  updateService,
  deleteService,
};
