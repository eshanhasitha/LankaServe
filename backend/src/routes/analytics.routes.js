import express from 'express';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { heatmap, overview, services } from '../controllers/analytics.controller.js';

const router = express.Router();

router.get('/heatmap', requireAdminAuth, heatmap);
router.get('/overview', requireAdminAuth, overview);
router.get('/services', requireAdminAuth, services);

export default router;
