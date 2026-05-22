import Job from '../models/Job.model.js';
import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import {
    createJob,
    updateJob,
    acceptJob,
    rejectJob,
    cancelJob,
    scanArrivalQR,
    startJob,
    confirmCompletion,
    finalizeCompletion,
} from '../services/job.service.js';
import { recalculateProviderBadges } from '../services/badge.service.js';
import { recalculateProviderRanking } from '../services/ranking.service.js';
import { writeAuditLog } from '../services/audit.service.js';
import { recomputeProviderStatsByUserId } from '../services/provider.service.js';

export const create = async (req, res, next) => {
    try {
        const job = await createJob(req.user._id, req.body);
        return sendResponse(res, { statusCode: 201, message: 'Job created', data: job });
    } catch (error) { next(error); }
};

export const update = async (req, res, next) => {
    try {
        const job = await updateJob(req.params.id, req.user._id, req.body);
        return sendResponse(res, { message: 'Job updated', data: job });
    } catch (error) { next(error); }
};

export const list = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        let filter = { isDeleted: false };
        if (req.user.role === 'customer') filter.customerId = req.user._id;
        if (req.user.role === 'provider') filter.providerId = req.user._id;

        const [items, total] = await Promise.all([
            Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Job.countDocuments(filter),
        ]);

        return sendResponse(res, { message: 'Jobs', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const getById = async (req, res, next) => {
    try {
        const filter = { _id: req.params.id, isDeleted: false };
        if (req.user.role === 'customer') filter.customerId = req.user._id;
        if (req.user.role === 'provider') {
            filter.$or = [
                { providerId: req.user._id },
                { preferredProviderId: req.user._id },
                {
                    status: 'pending',
                    providerId: null,
                    preferredProviderId: null,
                },
            ];
        }

        const job = await Job.findOne(filter)
            .populate('customerId', 'name profileImage district city email')
            .populate('providerId', 'name profileImage district city email');
        if (!job) throw new Error('Job not found');
        return sendResponse(res, { message: 'Job details', data: job });
    } catch (error) { next(error); }
};

export const accept = async (req, res, next) => {
    try {
        const result = await acceptJob(req.params.id, req.user._id);
        await writeAuditLog({ actorId: req.user._id, action: 'job_accept', entity: 'Job', entityId: String(req.params.id), ip: req.ip, userAgent: req.headers['user-agent'] || '' });
        return sendResponse(res, { message: 'Job accepted', data: result });
    } catch (error) { next(error); }
};

export const reject = async (req, res, next) => {
    try {
        const job = await rejectJob(req.params.id, req.user._id);
        return sendResponse(res, { message: 'Job rejected', data: job });
    } catch (error) { next(error); }
};

export const cancel = async (req, res, next) => {
    try {
        const job = await cancelJob(req.params.id, req.user._id);
        return sendResponse(res, { message: 'Job cancelled', data: job });
    } catch (error) { next(error); }
};

export const arrivalScan = async (req, res, next) => {
    try {
        const job = await scanArrivalQR(req.params.id, req.user._id, req.body.token);
        await writeAuditLog({ actorId: req.user._id, action: 'qr_scan', entity: 'Job', entityId: String(req.params.id), ip: req.ip, userAgent: req.headers['user-agent'] || '' });
        return sendResponse(res, { message: 'Arrival confirmed', data: job });
    } catch (error) { next(error); }
};

export const start = async (req, res, next) => {
    try {
        const job = await startJob(req.params.id, req.user._id);
        return sendResponse(res, { message: 'Job started', data: job });
    } catch (error) { next(error); }
};

export const completeProvider = async (req, res, next) => {
    try {
        const job = await confirmCompletion(req.params.id, req.user._id, 'provider');
        return sendResponse(res, { message: 'Provider completion confirmed', data: job });
    } catch (error) { next(error); }
};

export const completeCustomer = async (req, res, next) => {
    try {
        const job = await confirmCompletion(req.params.id, req.user._id, 'customer');
        return sendResponse(res, { message: 'Customer completion confirmed', data: job });
    } catch (error) { next(error); }
};

export const finalize = async (req, res, next) => {
    try {
        const job = await finalizeCompletion(req.params.id);
        if (job.providerId) {
            await recomputeProviderStatsByUserId(job.providerId);
            await recalculateProviderBadges(job.providerId);
            await recalculateProviderRanking(job.providerId);
        }
        await writeAuditLog({ actorId: req.user?._id || null, action: 'job_completion_finalize', entity: 'Job', entityId: String(req.params.id), ip: req.ip, userAgent: req.headers['user-agent'] || '' });
        return sendResponse(res, { message: 'Job finalized', data: job });
    } catch (error) { next(error); }
};
