import Job from '../models/Job.model.js';
import QRLog from '../models/QRLog.model.js';
import User from '../models/User.model.js';
import { generateSecureQR, verifySecureQR } from '../utils/qr.js';
import { sha256 } from '../utils/hash.js';
import { pushNotification } from './notification.service.js';

export const createJob = async (customerId, body) => {
    return Job.create({
        customerId,
        preferredProviderId: body.preferredProviderId || null,
        title: body.title,
        description: body.description,
        category: body.category,
        location: body.location,
        images: body.images || [],
        price: body.price,
        status: 'pending',
    });
};

export const updateJob = async (jobId, customerId, body) => {
    const job = await Job.findOne({ _id: jobId, customerId, isDeleted: false });
    if (!job) throw new Error('Job not found');
    if (job.status !== 'pending') throw new Error('Only pending jobs can be edited');

    job.title = body.title;
    job.description = body.description;
    job.category = body.category;
    job.location = body.location;
    job.images = body.images || [];
    job.price = body.price;
    await job.save();

    return job;
};

export const acceptJob = async (jobId, providerId) => {
    const job = await Job.findOne({ _id: jobId, isDeleted: false });
    if (!job || job.status !== 'pending') throw new Error('Job not available for accept');
    if (job.preferredProviderId && String(job.preferredProviderId) !== String(providerId)) {
        throw new Error('This request is assigned to another provider');
    }
    const provider = await User.findById(providerId).select('name');

    const qr = generateSecureQR({ jobId: String(job._id), providerId: String(providerId) });

    job.providerId = providerId;
    job.status = 'accepted';
    job.acceptedAt = new Date();
    job.responseTimeMinutes = Math.round((Date.now() - new Date(job.createdAt).getTime()) / 60000);
    job.qrTokenHash = qr.tokenHash;
    job.qrTokenValue = qr.token;
    job.qrTokenExpiresAt = qr.expiresAt;
    job.qrTokenUsedAt = null;
    await job.save();

    await pushNotification({
        userId: job.customerId,
        title: 'Job Request Accepted',
        body: `${provider?.name || 'A provider'} accepted your request for "${job.title}".`,
        type: 'job',
        data: { jobId: String(job._id), providerId: String(providerId), status: job.status },
    });

    return { job, qrToken: qr.token, qrExpiresAt: qr.expiresAt };
};

export const rejectJob = async (jobId, providerId) => {
    const job = await Job.findOne({ _id: jobId, isDeleted: false });
    if (!job) throw new Error('Job not found');

    const provider = await User.findById(providerId).select('name');
    const isAssignedProvider = String(job.providerId || '') === String(providerId);
    const isPreferredProvider = String(job.preferredProviderId || '') === String(providerId);

    if (job.status === 'accepted' && isAssignedProvider) {
        job.providerId = null;
        job.status = 'pending';
        await job.save();
        await pushNotification({
            userId: job.customerId,
            title: 'Job Request Reopened',
            body: `${provider?.name || 'Your provider'} is no longer assigned to "${job.title}". Your request is open again.`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        });
        return job;
    }

    if (job.status === 'pending' && isPreferredProvider) {
        job.preferredProviderId = null;
        await job.save();
        await pushNotification({
            userId: job.customerId,
            title: 'Direct Hire Declined',
            body: `${provider?.name || 'Your provider'} declined "${job.title}". Your request is now open to other providers.`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        });
        return job;
    }

    throw new Error('Job cannot be rejected now');
};

export const cancelJob = async (jobId, customerId) => {
    const job = await Job.findOne({ _id: jobId, customerId, isDeleted: false });
    if (!job) throw new Error('Job not found');
    if (['completed', 'paid'].includes(job.status)) throw new Error('Completed job cannot be cancelled');
    const previousProviderId = job.providerId;
    job.status = 'cancelled';
    await job.save();
    if (previousProviderId) {
        await pushNotification({
            userId: previousProviderId,
            title: 'Job Cancelled',
            body: `The customer cancelled the job "${job.title}".`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        });
    }
    return job;
};

export const scanArrivalQR = async (jobId, customerId, token) => {
    const job = await Job.findById(jobId).select('+qrTokenHash');
    if (!job) throw new Error('Job not found');

    let status = 'failed';
    let reason = 'invalid';

    try {
        verifySecureQR(token);
        const tokenHash = sha256(token);

        if (!job.qrTokenHash || tokenHash !== job.qrTokenHash) {
            reason = 'token_mismatch';
        } else if (!job.qrTokenExpiresAt || job.qrTokenExpiresAt < new Date()) {
            status = 'expired';
            reason = 'expired';
        } else if (job.qrTokenUsedAt) {
            status = 'used';
            reason = 'already_used';
        } else {
            status = 'success';
            reason = 'ok';
            job.status = 'arrived';
            job.arrivedAt = new Date();
            job.qrTokenUsedAt = new Date();
            job.qrTokenValue = null;
            await job.save();

            await Promise.all([
                pushNotification({
                    userId: job.customerId,
                    title: 'Provider Arrival Confirmed',
                    body: `Arrival has been confirmed for "${job.title}".`,
                    type: 'job',
                    data: { jobId: String(job._id), status: job.status },
                }),
                job.providerId
                    ? pushNotification({
                        userId: job.providerId,
                        title: 'Arrival Confirmed',
                        body: `The customer confirmed your arrival for "${job.title}".`,
                        type: 'job',
                        data: { jobId: String(job._id), status: job.status },
                    })
                    : Promise.resolve(),
            ]);
        }

        await QRLog.create({ jobId, scannedBy: customerId, status, reason, tokenHash });

        if (status !== 'success') throw new Error(`QR scan failed: ${reason}`);
        return job;
    } catch (error) {
        if (!error.message.startsWith('QR scan failed')) {
            await QRLog.create({ jobId, scannedBy: customerId, status: 'failed', reason: 'invalid_jwt', tokenHash: 'invalid' });
            throw new Error('QR token invalid');
        }
        throw error;
    }
};

export const startJob = async (jobId, providerId) => {
    const job = await Job.findOne({ _id: jobId, providerId, isDeleted: false });
    if (!job || job.status !== 'arrived') throw new Error('Job cannot be started');
    job.status = 'ongoing';
    await job.save();
    await pushNotification({
        userId: job.customerId,
        title: 'Job Started',
        body: `Work has started on "${job.title}".`,
        type: 'job',
        data: { jobId: String(job._id), status: job.status },
    });
    return job;
};

export const confirmCompletion = async (jobId, userId, role) => {
    const job = await Job.findById(jobId);
    if (!job || !['ongoing', 'completed'].includes(job.status)) throw new Error('Invalid job status');

    if (role === 'provider') {
        if (String(job.providerId) !== String(userId)) throw new Error('Forbidden');
        job.providerCompletion = true;
    }
    if (role === 'customer') {
        if (String(job.customerId) !== String(userId)) throw new Error('Forbidden');
        job.customerCompletion = true;
    }

    await job.save();

    if (role === 'provider') {
        await pushNotification({
            userId: job.customerId,
            title: 'Completion Confirmation Required',
            body: `Your provider marked "${job.title}" as completed. Please confirm to finish the job.`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        });
    }

    if (role === 'customer' && job.providerId) {
        await pushNotification({
            userId: job.providerId,
            title: 'Customer Confirmed Completion',
            body: `The customer confirmed completion for "${job.title}".`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        });
    }

    return job;
};

export const finalizeCompletion = async (jobId) => {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');
    if (!(job.providerCompletion && job.customerCompletion)) throw new Error('Dual confirmation not complete');
    job.status = 'completed';
    job.completedAt = new Date();
    await job.save();

    await Promise.all([
        pushNotification({
            userId: job.customerId,
            title: 'Job Completed',
            body: `"${job.title}" has been completed successfully.`,
            type: 'job',
            data: { jobId: String(job._id), status: job.status },
        }),
        job.providerId
            ? pushNotification({
                userId: job.providerId,
                title: 'Job Completed',
                body: `"${job.title}" has been finalized successfully.`,
                type: 'job',
                data: { jobId: String(job._id), status: job.status },
            })
            : Promise.resolve(),
    ]);

    return job;
};
