import cron from 'node-cron';
import { recalculateAllBadges } from '../services/badge.service.js';
import { logger } from '../config/logger.js';

export const badgeCron = () => {
    cron.schedule('30 2 * * *', async () => {
        try {
            await recalculateAllBadges();
            logger.info('Badge cron completed');
        } catch (error) {
            logger.error(`Badge cron failed: ${error.message}`);
        }
    });
};
