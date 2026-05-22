import express from 'express';
import authRoutes from './auth.routes.js';
import adminAuthRoutes from './admin-auth.routes.js';
import userRoutes from './user.routes.js';
import providerRoutes from './provider.routes.js';
import jobRoutes from './job.routes.js';
import reviewRoutes from './review.routes.js';
import paymentRoutes from './payment.routes.js';
import notificationRoutes from './notification.routes.js';
import messageRoutes from './message.routes.js';
import adminRoutes from './admin.routes.js';
import analyticsRoutes from './analytics.routes.js';
import uploadRoutes from './upload.routes.js';
import supportRequestRoutes from './support-request.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/providers', providerRoutes);
router.use('/jobs', jobRoutes);
router.use('/reviews', reviewRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/messages', messageRoutes);
router.use('/admin-auth', adminAuthRoutes);
router.use('/admin', adminRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/uploads', uploadRoutes);
router.use('/support-requests', supportRequestRoutes);

export default router;
