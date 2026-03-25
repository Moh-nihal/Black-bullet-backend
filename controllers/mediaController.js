const { deleteMediaFile, uploadMediaFile } = require("../services/mediaService");

const uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      const error = new Error("No file uploaded");
      error.statusCode = 400;
      throw error;
    }

    const media = await uploadMediaFile(req.file);

    res.status(201).json({
      ok: true,
      media,
    });
  } catch (error) {
    next(error);
  }
};

const deleteMedia = async (req, res, next) => {
  try {
    const { publicId, resourceType } = req.body;

    if (!publicId || typeof publicId !== "string") {
      const error = new Error("publicId is required");
      error.statusCode = 400;
      throw error;
    }

    if (resourceType && !["image", "video"].includes(resourceType)) {
      const error = new Error("resourceType must be either image or video");
      error.statusCode = 400;
      throw error;
    }

    await deleteMediaFile({ publicId, resourceType });

    res.status(200).json({
      ok: true,
      message: "Media deleted",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadMedia,
  deleteMedia,
};
