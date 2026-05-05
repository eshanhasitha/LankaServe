import cron from 'node-cron';
import { recalculateAllRankings } from '../services/ranking.service.js';
import { logger } from '../config/logger.js';

export const rankingCron = () => {
    cron.schedule('0 2 * * *', async () => {
        try {
            await recalculateAllRankings();
            logger.info('Ranking cron completed');
        } catch (error) {
            logger.error(`Ranking cron failed: ${error.message}`);
        }
    });
};
