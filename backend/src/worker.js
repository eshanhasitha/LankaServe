import { handleAsNodeRequest } from 'cloudflare:node';
import app from './app.js';
import { connectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { recalculateAllRankings } from './services/ranking.service.js';
import { recalculateAllBadges } from './services/badge.service.js';
import Job from './models/Job.model.js';
import QRLog from './models/QRLog.model.js';

const APP_PORT = Number(process.env.PORT || 3000);
app.listen(APP_PORT);

let dbReadyPromise = null;

const ensureDbConnection = async () => {
    if (!dbReadyPromise) {
        dbReadyPromise = connectDB().catch((error) => {
            dbReadyPromise = null;
            throw error;
        });
    }
    return dbReadyPromise;
};

const runCleanupTask = async () => {
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
};

const runScheduledTask = async (cronExpression) => {
    switch (cronExpression) {
        case '0 2 * * *':
            await recalculateAllRankings();
            logger.info('Ranking cron completed');
            break;
        case '30 2 * * *':
            await recalculateAllBadges();
            logger.info('Badge cron completed');
            break;
        case '0 3 * * *':
            await runCleanupTask();
            logger.info('Cleanup cron completed');
            break;
        case '0 4 * * *':
            logger.info('Backup cron placeholder: call external backup workflow from Cloudflare Cron trigger');
            break;
        default:
            logger.warn(`No scheduled task mapped for cron: ${cronExpression}`);
            break;
    }
};

export default {
    async fetch(request) {
        try {
            await ensureDbConnection();
            return handleAsNodeRequest(APP_PORT, request);
        } catch (error) {
            logger.error(`Worker fetch failed: ${error.message}`);
            return new Response(JSON.stringify({
                success: false,
                message: 'Service unavailable',
                data: null,
                pagination: null,
                errorCode: 'WORKER_BOOTSTRAP_FAILED',
            }), {
                status: 503,
                headers: { 'content-type': 'application/json' },
            });
        }
    },

    async scheduled(controller, env, ctx) {
        ctx.waitUntil((async () => {
            try {
                await ensureDbConnection();
                await runScheduledTask(controller.cron);
            } catch (error) {
                logger.error(`Scheduled task failed (${controller.cron}): ${error.message}`);
                throw error;
            }
        })());
    },
};
