import User from '../models/User.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import Job from '../models/Job.model.js';
import Review from '../models/Review.model.js';
import QRLog from '../models/QRLog.model.js';
import AuditLog from '../models/AuditLog.model.js';
import Advertisement from '../models/Advertisement.model.js';
import Badge from '../models/Badge.model.js';
import Notification from '../models/Notification.model.js';
import SupportRequest from '../models/SupportRequest.model.js';
import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { writeAuditLog } from '../services/audit.service.js';
import { formatNotificationTimeLabel, formatNotificationReceivedLabel } from '../services/notification.service.js';

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

export const providers = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };

        if (req.query?.verified === 'true') filter.verified = true;
        if (req.query?.verified === 'false') filter.verified = false;
        if (req.query?.verificationStatus) filter['verification.status'] = req.query.verificationStatus;

        const [items, total] = await Promise.all([
            ServiceProvider.find(filter)
                .populate('userId', 'name email role district city profileImage isActive createdAt')
                .populate('badges')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ServiceProvider.countDocuments(filter),
        ]);

        return sendResponse(res, {
            message: 'Providers',
            data: items,
            pagination: buildPaginationMeta({ page, limit, total }),
        });
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

function titleFromAuditAction(action) {
    return String(action || 'System Event')
        .replace(/[_-]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

function serializeAdminNotification(item, now = new Date()) {
    const object = typeof item.toObject === 'function' ? item.toObject() : item;
    const eventAt = object.createdAt || object.updatedAt || new Date();

    return {
        ...object,
        eventAt,
        timeLabel: formatNotificationTimeLabel(eventAt, now),
        receivedLabel: formatNotificationReceivedLabel(eventAt, now),
    };
}

function serializeSupportNotification(ticket, now = new Date()) {
    const user = ticket.userId || {};
    const eventAt = ticket.createdAt || ticket.updatedAt || new Date();

    return {
        _id: `support:${ticket._id}`,
        title: `Support request: ${ticket.subject || ticket.category}`,
        body: `${user.name || 'A user'} opened ${ticket.category || 'a support request'} (${ticket.ticketNumber}).`,
        type: 'system',
        isRead: true,
        synthetic: true,
        data: {
            supportRequestId: String(ticket._id),
            ticketNumber: ticket.ticketNumber,
            category: 'support',
            status: ticket.status,
        },
        createdAt: eventAt,
        updatedAt: ticket.updatedAt || eventAt,
        eventAt,
        timeLabel: formatNotificationTimeLabel(eventAt, now),
        receivedLabel: formatNotificationReceivedLabel(eventAt, now),
    };
}

function serializeAuditNotification(log, now = new Date()) {
    const eventAt = log.createdAt || log.updatedAt || new Date();

    return {
        _id: `audit:${log._id}`,
        title: titleFromAuditAction(log.action),
        body: `${log.entity || 'System'} ${log.entityId ? `#${String(log.entityId).slice(-6)}` : ''}`.trim(),
        type: 'system',
        isRead: true,
        synthetic: true,
        data: {
            auditLogId: String(log._id),
            action: log.action,
            entity: log.entity,
            entityId: log.entityId,
        },
        createdAt: eventAt,
        updatedAt: log.updatedAt || eventAt,
        eventAt,
        timeLabel: formatNotificationTimeLabel(eventAt, now),
        receivedLabel: formatNotificationReceivedLabel(eventAt, now),
    };
}

export const adminNotifications = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const now = new Date();
        const filter = {
            userId: req.admin._id,
            isDeleted: false,
        };

        if (req.query?.unreadOnly === 'true') filter.isRead = false;
        if (req.query?.type) filter.type = req.query.type;

        const [storedItems, storedTotal, supportItems, auditItems] = await Promise.all([
            Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
            Notification.countDocuments(filter),
            req.query?.unreadOnly === 'true'
                ? []
                : SupportRequest.find({ status: { $in: ['open', 'in_progress'] } })
                    .populate('userId', 'name email role')
                    .sort({ createdAt: -1 })
                    .limit(Math.min(limit, 10)),
            req.query?.unreadOnly === 'true'
                ? []
                : AuditLog.find({ isDeleted: false })
                    .sort({ createdAt: -1 })
                    .limit(Math.min(limit, 10)),
        ]);

        const items = [
            ...storedItems.map((item) => serializeAdminNotification(item, now)),
            ...supportItems.map((item) => serializeSupportNotification(item, now)),
            ...auditItems.map((item) => serializeAuditNotification(item, now)),
        ].sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());

        return sendResponse(res, {
            message: 'Admin notifications',
            data: items.slice(0, limit),
            pagination: buildPaginationMeta({ page, limit, total: storedTotal + supportItems.length + auditItems.length }),
        });
    } catch (error) { next(error); }
};

export const markAdminNotificationRead = async (req, res, next) => {
    try {
        const id = String(req.params.id || '');
        if (id.startsWith('support:') || id.startsWith('audit:')) {
            return sendResponse(res, { message: 'Notification read', data: { _id: id, isRead: true, synthetic: true } });
        }

        const item = await Notification.findOneAndUpdate(
            { _id: id, userId: req.admin._id, isDeleted: false },
            { isRead: true },
            { returnDocument: 'after' },
        );

        if (!item) {
            return sendResponse(res, { statusCode: 404, success: false, message: 'Notification not found' });
        }

        return sendResponse(res, { message: 'Notification read', data: serializeAdminNotification(item) });
    } catch (error) { next(error); }
};

export const markAllAdminNotificationsRead = async (req, res, next) => {
    try {
        const result = await Notification.updateMany(
            { userId: req.admin._id, isDeleted: false, isRead: false },
            { isRead: true },
        );

        return sendResponse(res, {
            message: 'Notifications read',
            data: { updated: result.modifiedCount || 0 },
        });
    } catch (error) { next(error); }
};

const REPORT_TYPES = new Set(['users', 'providers', 'jobs', 'qr', 'reviews', 'support']);

const normalizeReportRegion = (district) => {
    const text = String(district || '').trim();
    return text || 'Unknown';
};

const normalizeReportStatus = (status) => String(status || '').replace(/_/g, ' ').trim();

const shortProviderId = (value, index = 0) => {
    const raw = String(value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (raw.length >= 4) return `LP-${raw.slice(-4)}`;
    return `LP-${String(index + 1).padStart(4, '0')}`;
};

const reportInitials = (value, fallback = 'R') => {
    const text = String(value || fallback).trim();
    return text.slice(0, 2).toUpperCase();
};

const buildReportDateFilter = ({ fromDate, toDate }) => {
    const createdAt = {};

    if (fromDate) {
        const start = new Date(`${fromDate}T00:00:00.000`);
        if (!Number.isNaN(start.getTime())) createdAt.$gte = start;
    }

    if (toDate) {
        const end = new Date(`${toDate}T23:59:59.999`);
        if (!Number.isNaN(end.getTime())) createdAt.$lte = end;
    }

    return Object.keys(createdAt).length ? { createdAt } : {};
};

const filterReportRows = (rows, { statusFilter, regionFilter }) => {
    let nextRows = rows;

    if (statusFilter && statusFilter !== 'All Statuses') {
        nextRows = nextRows.filter((row) => String(row.status || '').toLowerCase() === String(statusFilter).toLowerCase());
    }

    if (regionFilter && regionFilter !== 'All Districts') {
        nextRows = nextRows.filter((row) => String(row.district || '').toLowerCase() === String(regionFilter).toLowerCase());
    }

    return nextRows;
};

export const reportRows = async (req, res, next) => {
    try {
        const type = REPORT_TYPES.has(req.query.type) ? req.query.type : 'providers';
        const statusFilter = req.query.status || 'All Statuses';
        const regionFilter = req.query.district || 'All Districts';
        const limit = Math.min(1000, Math.max(1, Number(req.query.limit || 500)));
        const dateFilter = buildReportDateFilter(req.query);
        const baseFilter = { isDeleted: false, ...dateFilter };
        let rows = [];

        if (type === 'users') {
            const usersList = await User.find(baseFilter).sort({ createdAt: -1 }).limit(limit);
            rows = usersList.map((user) => ({
                id: user._id,
                avatar: user.profileImage || '',
                initials: reportInitials(user.name, 'U'),
                name: user.name || 'Unknown User',
                sub: user.email || '-',
                category: user.role || '-',
                district: normalizeReportRegion(user.district),
                jobs: '-',
                rating: '-',
                status: user.isActive ? 'Active' : 'Inactive',
                createdAt: user.createdAt,
            }));
        }

        if (type === 'providers') {
            const providersList = await ServiceProvider.find(baseFilter)
                .populate('userId', 'name email role district city profileImage isActive createdAt')
                .sort({ createdAt: -1 })
                .limit(limit);

            rows = providersList.map((provider, index) => {
                const user = provider.userId || {};
                const status = !user.isActive ? 'Suspended' : provider.verified ? 'Verified' : 'Pending Approval';
                return {
                    id: provider._id,
                    avatar: user.profileImage || '',
                    initials: reportInitials(user.name, 'P'),
                    name: user.name || 'Unknown Provider',
                    sub: `ID: ${shortProviderId(user._id, index)}`,
                    category: provider.categories?.[0] || 'Other',
                    district: normalizeReportRegion(provider.district || user.district),
                    jobs: Number(provider.stats?.completedJobs || 0),
                    rating: Number(provider.stats?.averageRating || 0).toFixed(1),
                    status,
                    createdAt: provider.createdAt,
                };
            });
        }

        if (type === 'jobs') {
            const jobsList = await Job.find(baseFilter)
                .populate('customerId', 'name email district city profileImage')
                .populate('providerId', 'name email district city profileImage')
                .sort({ createdAt: -1 })
                .limit(limit);

            rows = jobsList.map((job) => {
                const providerUser = job.providerId || {};
                const customerUser = job.customerId || {};
                return {
                    id: job._id,
                    avatar: providerUser.profileImage || customerUser.profileImage || '',
                    initials: reportInitials(providerUser.name || customerUser.name, 'J'),
                    name: job.title || 'Untitled Job',
                    sub: `Provider: ${providerUser.name || 'Unassigned'}`,
                    category: job.category || 'General',
                    district: normalizeReportRegion(customerUser.district || customerUser.city),
                    jobs: Number(job.price || job.budget || 0),
                    rating: '-',
                    status: normalizeReportStatus(job.status || 'pending'),
                    createdAt: job.createdAt,
                };
            });
        }

        if (type === 'qr') {
            const qrList = await QRLog.find(baseFilter)
                .populate('scannedBy', 'name email district city profileImage')
                .populate({
                    path: 'jobId',
                    populate: [
                        { path: 'customerId', select: 'name email district city profileImage' },
                        { path: 'providerId', select: 'name email district city profileImage' },
                    ],
                })
                .sort({ createdAt: -1 })
                .limit(limit);

            rows = qrList.map((log) => {
                const job = log.jobId || {};
                const providerUser = job.providerId || log.scannedBy || {};
                const customerUser = job.customerId || {};
                return {
                    id: log._id,
                    avatar: providerUser.profileImage || '',
                    initials: reportInitials(providerUser.name, 'Q'),
                    name: providerUser.name || 'Unknown Provider',
                    sub: `Log: ${String(log._id || '').slice(-6).toUpperCase()}`,
                    category: customerUser.name || 'Unknown Customer',
                    district: normalizeReportRegion(customerUser.district || customerUser.city || log.scannedBy?.district),
                    jobs: '-',
                    rating: '-',
                    status: log.status === 'success' ? 'VERIFIED' : String(log.status || 'FAILED').toUpperCase(),
                    createdAt: log.createdAt,
                };
            });
        }

        if (type === 'reviews') {
            const reviewsList = await Review.find(baseFilter)
                .populate('customerId', 'name email district city profileImage')
                .populate('providerId', 'name email district city profileImage')
                .sort({ createdAt: -1 })
                .limit(limit);

            rows = reviewsList.map((review) => {
                const providerUser = review.providerId || {};
                const customerUser = review.customerId || {};
                const score = Number(review.rating || 0);
                let sentiment = 'Neutral';
                if (score >= 4) sentiment = 'Positive';
                else if (score <= 2) sentiment = 'Negative';

                return {
                    id: review._id,
                    avatar: providerUser.profileImage || '',
                    initials: reportInitials(providerUser.name, 'R'),
                    name: providerUser.name || 'Unknown Provider',
                    sub: `Customer: ${customerUser.name || 'Unknown'}`,
                    category: String(review.comment || '').slice(0, 32) || '-',
                    district: normalizeReportRegion(customerUser.district || customerUser.city),
                    jobs: '-',
                    rating: score.toFixed(1),
                    status: sentiment,
                    createdAt: review.createdAt,
                };
            });
        }

        if (type === 'support') {
            const supportList = await SupportRequest.find(dateFilter)
                .populate('userId', 'name email role district city profileImage')
                .populate('assignedAdminId', 'name role')
                .sort({ createdAt: -1 })
                .limit(limit);

            rows = supportList.map((ticket) => {
                const user = ticket.userId || {};
                const assignedAdmin = ticket.assignedAdminId || {};
                return {
                    id: ticket._id,
                    avatar: user.profileImage || '',
                    initials: reportInitials(user.name, 'S'),
                    name: ticket.subject || ticket.category || 'Support Request',
                    sub: `${ticket.ticketNumber || ''}${assignedAdmin.name ? ` • Assigned: ${assignedAdmin.name}` : ''}`.trim(),
                    category: ticket.category || 'Support',
                    district: normalizeReportRegion(user.district || user.city),
                    jobs: ticket.priority || '-',
                    rating: '-',
                    status: normalizeReportStatus(ticket.status || 'open'),
                    createdAt: ticket.createdAt,
                };
            });
        }

        const filteredRows = filterReportRows(rows, { statusFilter, regionFilter });

        return sendResponse(res, {
            message: 'Report rows',
            data: {
                type,
                rows: filteredRows,
                total: filteredRows.length,
                generatedAt: new Date(),
            },
        });
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
