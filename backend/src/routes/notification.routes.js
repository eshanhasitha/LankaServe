import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { myNotifications, readNotification, adminBroadcast } from '../controllers/notification.controller.js';

const router = express.Router();

router.post('/admin/broadcast', requireAdminAuth, validate(Joi.object({ title: Joi.string().required(), body: Joi.string().required(), type: Joi.string().valid('job', 'payment', 'system', 'offer').default('system') })), adminBroadcast);

router.use(requireAuth);
router.get('/my', myNotifications);
router.put('/read/:id', readNotification);

export default router;
