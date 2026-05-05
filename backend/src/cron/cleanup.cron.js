import cron from 'node-cron';
import Job from '../models/Job.model.js';
import QRLog from '../models/QRLog.model.js';
import { logger } from '../config/logger.js';

export const cleanupCron = () => {
    cron.schedule('0 3 * * *', async () => {
        try {
            const old = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            await QRLog.deleteMany({ createdAt: { $lt: old } });

            await Job.updateMany(
                { status: 'pending', createdAt: { $lt: new Date(Date.now() - 48 * 60 * 60 * 1000) }, isDeleted: false },
                { status: 'cancelled' }
            );

            await Job.updateMany(
                { status: 'accepted', qrTokenExpiresAt: { $lt: new Date() }, qrTokenUsedAt: null, isDeleted: false },
                { status: 'pending', providerId: null, qrTokenHash: null, qrTokenExpiresAt: null }
            );

            logger.info('Cleanup cron completed');
        } catch (error) {
            logger.error(`Cleanup cron failed: ${error.message}`);
        }
    });
};
