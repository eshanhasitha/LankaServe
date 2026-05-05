import express from 'express';
import multer from 'multer';
import { uploadProfileImage } from '../controllers/upload.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireAuth);
router.post('/profile-image', upload.single('image'), uploadProfileImage);

export default router;
