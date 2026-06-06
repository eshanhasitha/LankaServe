import express from 'express';
import Joi from 'joi';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
    dashboard,
    users,
    deactivateUser,
    providers,
    verifyProvider,
    reportRows,
    jobs,
    reviews,
    qrLogs,
    auditLogs,
    adminNotifications,
    markAdminNotificationRead,
    markAllAdminNotificationsRead,
    ads,
    createAd,
    updateAd,
    deleteAd,
    badgeRules,
    createBadgeRule,
    updateBadgeRule,
    deleteBadgeRule,
    listBroadcasts,
    createBroadcast,
    resendBroadcast,
    cancelBroadcast,
} from '../controllers/admin.controller.js';
import {
    listSupportRequestsForAdmin,
    getSupportRequestForAdmin,
    updateSupportRequestForAdmin,
} from '../controllers/support-request.controller.js';
import {
    adminSupportConversations,
    adminSupportThread,
    adminSendSupportMessage,
    adminReadSupportThread,
} from '../controllers/message.controller.js';
import {
    createBackup,
    listBackups,
    restoreBackup,
} from '../controllers/backup.controller.js';

const router = express.Router();

router.use(requireAdminAuth);

router.get('/dashboard', dashboard);
router.get('/users', users);
router.put('/users/:id/deactivate', deactivateUser);
router.get('/providers', providers);
router.put('/providers/:id/verify', verifyProvider);
router.get('/reports', reportRows);
router.get('/jobs', jobs);
router.get('/reviews', reviews);
router.get('/qr-logs', qrLogs);
router.get('/audit-logs', auditLogs);
router.get('/notifications', adminNotifications);
router.put('/notifications/read-all', markAllAdminNotificationsRead);
router.put('/notifications/:id/read', markAdminNotificationRead);
router.get('/backups', listBackups);
router.post('/backups', createBackup);
router.post('/backups/:id/restore', restoreBackup);
router.get('/ads', ads);
router.post('/ads', createAd);
router.put('/ads/:id', updateAd);
router.delete('/ads/:id', deleteAd);
router.get('/badge-rules', badgeRules);
router.post('/badge-rules', createBadgeRule);
router.put('/badge-rules/:id', updateBadgeRule);
router.delete('/badge-rules/:id', deleteBadgeRule);
router.get('/broadcasts', listBroadcasts);
router.post('/broadcasts', createBroadcast);
router.post('/broadcasts/:id/resend', resendBroadcast);
router.put('/broadcasts/:id/cancel', cancelBroadcast);
router.get('/support-requests', listSupportRequestsForAdmin);
router.get('/support-requests/:id', getSupportRequestForAdmin);
router.put(
    '/support-requests/:id',
    validate(
        Joi.object({
            status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').optional(),
            priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
            adminNotes: Joi.string().allow('').max(5000).optional(),
        }).min(1),
    ),
    updateSupportRequestForAdmin,
);

router.get('/support-chats/conversations', adminSupportConversations);
router.get('/support-chats/thread/:userId', adminSupportThread);
router.post(
    '/support-chats/send',
    validate(Joi.object({ userId: Joi.string().required(), content: Joi.string().trim().min(1).max(2000).required() })),
    adminSendSupportMessage,
);
router.put('/support-chats/read/:threadId', adminReadSupportThread);

export default router;
