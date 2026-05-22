import Job from '../models/Job.model.js';
import { generateSecureQR } from '../utils/qr.js';

export const generateJobQrToken = async (jobId, providerId) => {
    const job = await Job.findById(jobId).select('+qrTokenValue +qrTokenHash');
    if (!job) throw new Error('Job not found');

    const hasActiveToken = Boolean(
        job.qrTokenValue &&
        job.qrTokenHash &&
        job.qrTokenExpiresAt &&
        job.qrTokenExpiresAt > new Date() &&
        !job.qrTokenUsedAt
    );

    if (hasActiveToken) {
        return {
            token: job.qrTokenValue,
            tokenHash: job.qrTokenHash,
            expiresAt: job.qrTokenExpiresAt,
        };
    }

    const qr = generateSecureQR({ jobId: String(jobId), providerId: String(providerId) });
    job.qrTokenValue = qr.token;
    job.qrTokenHash = qr.tokenHash;
    job.qrTokenExpiresAt = qr.expiresAt;
    job.qrTokenUsedAt = null;
    await job.save();
    return qr;
};
