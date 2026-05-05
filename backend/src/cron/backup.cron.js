import cron from 'node-cron';
import { logger } from '../config/logger.js';

export const backupCron = () => {
    cron.schedule('0 4 * * *', async () => {
        logger.info('Backup cron placeholder: call scripts/backup.sh or scripts/backup.ps1 from scheduler');
    });
};
