const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// Allowed upload types and their destination folders
const ALLOWED_TYPES = ['cab', 'hotel', 'package'];

// Configure storage engine — files go to uploads/<type>/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.params.type;
    if (!ALLOWED_TYPES.includes(type)) {
      return cb(new Error('Invalid upload type'));
    }
    const dir = path.join(__dirname, '..', '..', 'uploads', `${type}s`);
    // Ensure directory exists
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Unique filename: type-timestamp-random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${req.params.type}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter — only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5 // Max 5 files per request
  }
});

/**
 * POST /api/upload/:type
 * :type = cab | hotel | package
 * Accepts up to 5 images (field name: "images")
 * Returns array of uploaded file paths
 */
router.post('/:type', (req, res) => {
  const type = req.params.type;
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: `Invalid type "${type}". Allowed: ${ALLOWED_TYPES.join(', ')}` });
  }

  const uploader = upload.array('images', 5);

  uploader(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max size is 5MB per image.' });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ error: 'Too many files. Max 5 images allowed.' });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Build public URLs for each uploaded file
    const filePaths = req.files.map(file => {
      return `/uploads/${type}s/${file.filename}`;
    });

    res.status(200).json({
      message: `${req.files.length} image(s) uploaded successfully`,
      images: filePaths
    });
  });
});

module.exports = router;
