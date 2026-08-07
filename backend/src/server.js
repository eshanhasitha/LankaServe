import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { rankingCron } from './cron/ranking.cron.js';
import { badgeCron } from './cron/badge.cron.js';
import { cleanupCron } from './cron/cleanup.cron.js';
import { backupCron } from './cron/backup.cron.js';
import { bootstrapAdminAccount } from './services/admin-bootstrap.service.js';

const start = async () => {
    await connectDB();
    await bootstrapAdminAccount();

    app.listen(env.PORT, () => {
        logger.info(`Server running on port ${env.PORT}`);
    });

    rankingCron();
    badgeCron();
    cleanupCron();
    backupCron();
};

start().catch((error) => {
    logger.error(`Server bootstrap failed: ${error.message}`);
    process.exit(1);
});

