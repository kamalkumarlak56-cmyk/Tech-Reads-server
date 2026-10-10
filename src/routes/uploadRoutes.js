const express = require("express");
const asyncHandler = require("express-async-handler");
const upload = require("../middleware/uploadMiddleware");
const { protect } = require("../middleware/authMiddleware");
const { cloudinary, isCloudinaryConfigured } = require("../config/cloudinary");

const router = express.Router();

const uploadToCloudinary = (fileBuffer, folder = "techreads") => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    stream.end(fileBuffer);
  });
};

router.post(
  "/",
  protect,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (err) {
        res.status(400);
        return next(new Error(err.message || "Image upload failed"));
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400);
      throw new Error("No image file provided");
    }

    if (!isCloudinaryConfigured()) {
      res.status(500);
      throw new Error(
        "Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in server/.env"
      );
    }

    const folder = req.query.folder === "avatars" ? "techreads/avatars" : "techreads/products";
    const result = await uploadToCloudinary(req.file.buffer, folder);

    res.status(200).json({
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    });
  })
);

module.exports = router;