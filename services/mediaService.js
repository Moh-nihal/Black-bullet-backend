const streamifier = require("streamifier");

const getCloudinary = require("../config/cloudinary");

const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const inferResourceType = (mimeType) => {
  if (ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    return "image";
  }

  if (ALLOWED_VIDEO_MIME_TYPES.includes(mimeType)) {
    return "video";
  }

  return null;
};

const uploadBufferToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const cloudinary = getCloudinary();
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

const uploadMediaFile = async (file) => {
  const resourceType = inferResourceType(file.mimetype);

  if (!resourceType) {
    const error = new Error(
      "Unsupported file type. Allowed: jpg, png, webp, mp4, webm, mov"
    );
    error.statusCode = 400;
    throw error;
  }

  const uploadResult = await uploadBufferToCloudinary(file.buffer, {
    folder: "black_bullet",
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });

  return {
    resourceType,
    publicId: uploadResult.public_id,
    url: uploadResult.secure_url,
    width: uploadResult.width || null,
    height: uploadResult.height || null,
    duration: uploadResult.duration || null,
    bytes: uploadResult.bytes || null,
    format: uploadResult.format || null,
  };
};

const deleteMediaFile = async ({ publicId, resourceType }) => {
  const normalizedType = resourceType === "video" ? "video" : "image";
  const cloudinary = getCloudinary();

  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: normalizedType,
  });

  if (result.result !== "ok" && result.result !== "not found") {
    const error = new Error("Failed to delete media asset");
    error.statusCode = 502;
    throw error;
  }

  return result;
};

module.exports = {
  uploadMediaFile,
  deleteMediaFile,
  inferResourceType,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
};
