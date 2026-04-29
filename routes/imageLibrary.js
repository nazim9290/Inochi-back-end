const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { checkAdmin } = require('../middleware/admin');
const { listImages } = require('../controllers/imageLibrary');

// EN: Admin-only — exposes the Cloudinary asset list so the admin UI can
//     browse + reuse already-uploaded images instead of re-uploading.
// BN: Admin-only — Cloudinary asset list expose, admin UI browse + reuse
//     করতে পারে, re-upload করতে হয় না।
router.get('/cloudinary-images', requireAuth, checkAdmin, listImages);

module.exports = router;
