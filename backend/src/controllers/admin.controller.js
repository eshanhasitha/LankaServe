import User from '../models/User.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import Job from '../models/Job.model.js';
import Review from '../models/Review.model.js';
import QRLog from '../models/QRLog.model.js';
import AuditLog from '../models/AuditLog.model.js';
import Advertisement from '../models/Advertisement.model.js';
import Badge from '../models/Badge.model.js';
import Notification from '../models/Notification.model.js';
import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { writeAuditLog } from '../services/audit.service.js';

export const dashboard = async (req, res, next) => {
    try {
        const [users, providers, jobs, reviews] = await Promise.all([
            User.countDocuments({ isDeleted: false }),
            ServiceProvider.countDocuments({ isDeleted: false }),
            Job.countDocuments({ isDeleted: false }),
            Review.countDocuments({ isDeleted: false }),
        ]);
        return sendResponse(res, { message: 'Admin dashboard', data: { users, providers, jobs, reviews } });
    } catch (error) { next(error); }
};

export const users = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            User.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Users', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const deactivateUser = async (req, res, next) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { returnDocument: 'after' });
        return sendResponse(res, { message: 'User deactivated', data: user });
    } catch (error) { next(error); }
};

export const verifyProvider = async (req, res, next) => {
    try {
        const provider = await ServiceProvider.findByIdAndUpdate(
            req.params.id,
            {
                verified: true,
                'verification.status': 'verified',
                'verification.reviewedAt': new Date(),
                'verification.rejectionReason': '',
            },
            { returnDocument: 'after' },
        );
        await writeAuditLog({
            actorId: req.admin._id,
            action: 'provider_verify',
            entity: 'ServiceProvider',
            entityId: String(req.params.id),
            metadata: { actorType: 'admin', adminRole: req.admin.role },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
        return sendResponse(res, { message: 'Provider verified', data: provider });
    } catch (error) { next(error); }
};

export const jobs = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Job.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Jobs', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const reviews = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Review.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Reviews', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const qrLogs = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            QRLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            QRLog.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'QR logs', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const auditLogs = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            AuditLog.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Audit logs', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const ads = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            Advertisement.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Advertisement.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Ads', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const createAd = async (req, res, next) => {
    try {
        const { title, description = '', category = 'General Discount', imageUrl, startsAt, endsAt, status = 'active' } = req.body || {};

        if (!title || !imageUrl) {
            return sendResponse(res, { statusCode: 400, message: 'title and imageUrl are required' });
        }

        const now = new Date();
        const startDate = startsAt ? new Date(startsAt) : now;
        const endDate = endsAt ? new Date(endsAt) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const ad = await Advertisement.create({
            title,
            description,
            category,
            imageUrl,
            startsAt: startDate,
            endsAt: endDate,
            status,
        });

        return sendResponse(res, { statusCode: 201, message: 'Ad created', data: ad });
    } catch (error) { next(error); }
};

export const updateAd = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates._id;
        const ad = await Advertisement.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Ad updated', data: ad });
    } catch (error) { next(error); }
};

export const deleteAd = async (req, res, next) => {
    try {
        const ad = await Advertisement.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true, deletedAt: new Date(), status: 'ended' },
            { returnDocument: 'after' },
        );
        return sendResponse(res, { message: 'Ad deleted', data: ad });
    } catch (error) { next(error); }
};

export const badgeRules = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        const [items, total] = await Promise.all([
            Badge.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Badge.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Badge rules', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const createBadgeRule = async (req, res, next) => {
    try {
        const {
            code,
            name,
            weight = 0,
            minRating = 0,
            minCompletedJobs = 0,
            maxResponseTimeMinutes = 0,
            isActive = true,
        } = req.body || {};

        if (!name) {
            return sendResponse(res, { statusCode: 400, message: 'name is required' });
        }

        const normalizedCode = String(code || name)
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');

        const badge = await Badge.create({
            code: normalizedCode,
            name,
            weight,
            minRating,
            minCompletedJobs,
            maxResponseTimeMinutes,
            isActive,
        });

        return sendResponse(res, { statusCode: 201, message: 'Badge rule created', data: badge });
    } catch (error) { next(error); }
};

export const updateBadgeRule = async (req, res, next) => {
    try {
        const updates = { ...req.body };
        delete updates._id;
        delete updates.code;
        const badge = await Badge.findByIdAndUpdate(req.params.id, updates, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Badge rule updated', data: badge });
    } catch (error) { next(error); }
};

export const deleteBadgeRule = async (req, res, next) => {
    try {
        const badge = await Badge.findByIdAndUpdate(
            req.params.id,
            { isDeleted: true, deletedAt: new Date(), isActive: false },
            { returnDocument: 'after' },
        );
        return sendResponse(res, { message: 'Badge rule deleted', data: badge });
    } catch (error) { next(error); }
};

export const listBroadcasts = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);

        const pipeline = [
            {
                $match: {
                    isDeleted: false,
                    'data.broadcastId': { $exists: true, $ne: null },
                },
            },
            {
                $group: {
                    _id: '$data.broadcastId',
                    title: { $first: '$title' },
                    body: { $first: '$body' },
                    type: { $first: '$type' },
                    language: { $first: '$language' },
                    targetAudience: { $first: '$data.targetAudience' },
                    status: { $first: '$data.status' },
                    scheduledAt: { $first: '$data.scheduledAt' },
                    sentByName: { $first: '$data.sentByName' },
                    createdAt: { $max: '$createdAt' },
                    recipients: { $sum: 1 },
                },
            },
            { $sort: { createdAt: -1 } },
        ];

        const [items, totalRows] = await Promise.all([
            Notification.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
            Notification.aggregate([...pipeline, { $count: 'total' }]),
        ]);

        const total = totalRows[0]?.total || 0;
        return sendResponse(res, {
            message: 'Broadcasts',
            data: items.map((item) => ({
                id: item._id,
                title: item.title || '',
                body: item.body || '',
                targetAudience: item.targetAudience || 'all_users',
                language: item.language || 'en',
                status: item.status || 'sent',
                type: item.type || 'system',
                scheduledAt: item.scheduledAt || null,
                sentByName: item.sentByName || 'Admin',
                createdAt: item.createdAt || null,
                recipients: item.recipients || 0,
            })),
            pagination: buildPaginationMeta({ page, limit, total }),
        });
    } catch (error) { next(error); }
};

export const createBroadcast = async (req, res, next) => {
    try {
        const {
            title,
            body,
            targetAudience = 'all_users',
            language = 'en',
            type = 'system',
            scheduledAt = null,
        } = req.body || {};

        if (!title || !body) {
            return sendResponse(res, { statusCode: 400, message: 'title and body are required' });
        }

        const userFilter = { isDeleted: false, isActive: true };
        if (targetAudience === 'customers') userFilter.role = 'customer';
        if (targetAudience === 'providers') userFilter.role = 'provider';

        const users = await User.find(userFilter).select('_id');
        if (!users.length) {
            return sendResponse(res, { statusCode: 404, message: 'No recipients found', data: { recipients: 0 } });
        }

        const now = new Date();
        const schedule = scheduledAt ? new Date(scheduledAt) : null;
        const isScheduled = schedule && !Number.isNaN(schedule.getTime()) && schedule > now;
        const broadcastId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        const docs = users.map((user) => ({
            userId: user._id,
            title,
            body,
            type,
            language,
            data: {
                broadcastId,
                targetAudience,
                status: isScheduled ? 'scheduled' : 'sent',
                scheduledAt: isScheduled ? schedule : null,
                sentBy: String(req.admin?._id || ''),
                sentByName: req.admin?.name || 'Admin',
            },
        }));

        await Notification.insertMany(docs);
        return sendResponse(res, {
            statusCode: 201,
            message: isScheduled ? 'Broadcast scheduled' : 'Broadcast sent',
            data: { broadcastId, recipients: docs.length },
        });
    } catch (error) { next(error); }
};

export const resendBroadcast = async (req, res, next) => {
    try {
        const source = await Notification.findOne({ isDeleted: false, 'data.broadcastId': req.params.id });
        if (!source) {
            return sendResponse(res, { statusCode: 404, message: 'Broadcast not found' });
        }

        req.body = {
            title: source.title,
            body: source.body,
            targetAudience: source?.data?.targetAudience || 'all_users',
            language: source.language || 'en',
            type: source.type || 'system',
            scheduledAt: null,
        };

        return createBroadcast(req, res, next);
    } catch (error) { next(error); }
};

export const cancelBroadcast = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            { isDeleted: false, 'data.broadcastId': req.params.id, 'data.status': 'scheduled' },
            { $set: { 'data.status': 'cancelled' } },
        );

        return sendResponse(res, { message: 'Broadcast cancelled', data: { updated: result.modifiedCount || 0 } });
    } catch (error) { next(error); }
};
