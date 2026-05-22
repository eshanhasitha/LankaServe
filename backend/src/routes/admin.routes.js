import express from 'express';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import {
    dashboard,
    users,
    deactivateUser,
    verifyProvider,
    jobs,
    reviews,
    qrLogs,
    auditLogs,
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

const router = express.Router();

router.use(requireAdminAuth);

router.get('/dashboard', dashboard);
router.get('/users', users);
router.put('/users/:id/deactivate', deactivateUser);
router.put('/providers/:id/verify', verifyProvider);
router.get('/jobs', jobs);
router.get('/reviews', reviews);
router.get('/qr-logs', qrLogs);
router.get('/audit-logs', auditLogs);
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

export default router;
