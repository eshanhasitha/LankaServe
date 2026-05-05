import ServiceProvider from '../models/ServiceProvider.model.js';
import User from '../models/User.model.js';
import Job from '../models/Job.model.js';
import Review from '../models/Review.model.js';
import { sendResponse } from '../utils/response.js';
import { applyProvider, browseOpenJobs, getProviderAnalytics, getProviderDashboard, listProviderHiringRequests, listProviderJobs, listSuggestedJobs, providerEarnings } from '../services/provider.service.js';
import { listProviderBadges } from '../services/badge.service.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { writeAuditLog } from '../services/audit.service.js';
import { generateJobQrToken } from '../services/qr.service.js';

export const apply = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { role: 'provider' });
        const profile = await applyProvider(req.user._id, req.body);
        await writeAuditLog({ actorId: req.user._id, action: 'provider_apply', entity: 'ServiceProvider', entityId: String(profile._id), ip: req.ip, userAgent: req.headers['user-agent'] || '' });
        return sendResponse(res, { statusCode: 201, message: 'Provider application submitted', data: profile });
    } catch (error) {
        next(error);
    }
};

export const getMeProvider = async (req, res, next) => {
    try {
        const profile = await ServiceProvider.findOne({ userId: req.user._id, isDeleted: false }).populate('badges');
        return sendResponse(res, { message: 'Provider profile', data: profile });
    } catch (error) { next(error); }
};

export const updateMeProvider = async (req, res, next) => {
    try {
        const profile = await ServiceProvider.findOneAndUpdate({ userId: req.user._id, isDeleted: false }, req.body, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Provider profile updated', data: profile });
    } catch (error) { next(error); }
};

export const setAvailability = async (req, res, next) => {
    try {
        const profile = await ServiceProvider.findOneAndUpdate({ userId: req.user._id, isDeleted: false }, { availability: req.body.availability }, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Availability updated', data: profile });
    } catch (error) { next(error); }
};

export const dashboard = async (req, res, next) => {
    try {
        const data = await getProviderDashboard(req.user._id);
        return sendResponse(res, { message: 'Provider dashboard', data });
    } catch (error) { next(error); }
};

export const analytics = async (req, res, next) => {
    try {
        const data = await getProviderAnalytics(req.user._id, { periodMonths: req.query.periodMonths });
        return sendResponse(res, { message: 'Provider analytics', data });
    } catch (error) { next(error); }
};

export const badges = async (req, res, next) => {
    try {
        const data = await listProviderBadges(req.user._id);
        return sendResponse(res, { message: 'Provider badges', data });
    } catch (error) { next(error); }
};

export const jobs = async (req, res, next) => {
    try {
        const data = await listProviderJobs(req.user._id, req.query);
        return sendResponse(res, { message: 'Provider jobs', data: data.items, pagination: data.pagination });
    } catch (error) { next(error); }
};

export const browseJobs = async (req, res, next) => {
    try {
        const data = await browseOpenJobs(req.user._id, req.query);
        return sendResponse(res, { message: 'Open jobs for browsing', data: data.items, pagination: data.pagination });
    } catch (error) { next(error); }
};

export const jobRequests = async (req, res, next) => {
    try {
        const data = await listProviderHiringRequests(req.user._id, req.query);
        return sendResponse(res, { message: 'Provider hiring requests', data: data.items, pagination: data.pagination });
    } catch (error) { next(error); }
};

export const earnings = async (req, res, next) => {
    try {
        const pg = getPagination(req.query);
        const data = await providerEarnings(req.user._id, { ...pg, periodMonths: req.query.periodMonths });
        return sendResponse(res, { message: 'Provider earnings', data: { summary: data.summary, list: data.items }, pagination: data.pagination });
    } catch (error) { next(error); }
};

export const suggestions = async (req, res, next) => {
    try {
        const items = await listSuggestedJobs(req.user._id, 20);
        return sendResponse(res, { message: 'Job suggestions', data: items });
    } catch (error) { next(error); }
};

export const publicProfile = async (req, res, next) => {
    try {
        const profile = await ServiceProvider.findOne({ userId: req.params.id, isDeleted: false })
            .populate('userId', 'name profileImage email')
            .populate('badges');
        if (!profile) {
            return sendResponse(res, { statusCode: 404, message: 'Provider profile not found', data: null });
        }

        const ratingBuckets = await Review.aggregate([
            { $match: { providerId: profile.userId._id, isDeleted: false } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 },
                },
            },
        ]);

        const totalReviews = ratingBuckets.reduce((sum, item) => sum + Number(item.count || 0), 0);
        const bucketMap = new Map(ratingBuckets.map((item) => [Number(item._id), Number(item.count || 0)]));
        const ratingBreakdown = [5, 4, 3, 2, 1].map((rating) => {
            const count = bucketMap.get(rating) || 0;
            return {
                rating,
                count,
                percent: totalReviews > 0 ? Number(((count / totalReviews) * 100).toFixed(0)) : 0,
            };
        });

        const [reviewAverageAgg, completedJobsCount] = await Promise.all([
            Review.aggregate([
                { $match: { providerId: profile.userId._id, isDeleted: false } },
                { $group: { _id: null, avgRating: { $avg: '$rating' } } },
            ]),
            Job.countDocuments({
                providerId: profile.userId._id,
                status: { $in: ['completed', 'paid'] },
                isDeleted: false,
            }),
        ]);

        const liveAverageRating = Number((reviewAverageAgg[0]?.avgRating || 0).toFixed(2));

        const availabilityDetails = {
            status: profile.availability === 'online' ? 'Available Now' : 'Unavailable',
            schedule: [
                { label: 'Mon - Fri', hours: '08:00 - 18:00' },
                { label: 'Sat', hours: '09:00 - 15:00' },
                { label: 'Sun', hours: 'Closed' },
            ],
        };

        return sendResponse(res, {
            message: 'Provider profile',
            data: {
                ...profile.toObject(),
                stats: {
                    ...(profile.stats || {}),
                    averageRating: liveAverageRating,
                    completedJobs: completedJobsCount,
                },
                ratingBreakdown,
                availabilityDetails,
                totalReviews,
            },
        });
    } catch (error) { next(error); }
};

export const searchProviders = async (req, res, next) => {
    try {
        const providerUsers = await User.find({ role: 'provider', isDeleted: false }).select('_id');
        const providerUserIds = providerUsers.map((item) => item._id);

        if (providerUserIds.length) {
            const existingProfiles = await ServiceProvider.find({ userId: { $in: providerUserIds }, isDeleted: false }).select('userId');
            const existingUserIds = new Set(existingProfiles.map((item) => String(item.userId)));
            const missingUserIds = providerUserIds.filter((userId) => !existingUserIds.has(String(userId)));

            if (missingUserIds.length) {
                await ServiceProvider.insertMany(
                    missingUserIds.map((userId) => ({
                        userId,
                        categories: ['Other'],
                        bio: '',
                        yearsExperience: 0,
                        location: { type: 'Point', coordinates: [79.8612, 6.9271] },
                    })),
                    { ordered: false }
                ).catch(() => null);
            }
        }

        const { page, limit, skip } = getPagination(req.query);
        const filter = { isDeleted: false };
        if (req.query.category) filter.categories = req.query.category;
        if (req.query.verified === 'true') filter.verified = true;
        if (req.query.verified === 'false') filter.verified = false;

        const [items, total] = await Promise.all([
            ServiceProvider.find(filter)
                .sort({ verified: -1, 'stats.rankingScore': -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'name profileImage'),
            ServiceProvider.countDocuments(filter),
        ]);

        const userIds = items
            .map((item) => item?.userId?._id || item?.userId)
            .filter(Boolean);

        const [reviewAgg, completedJobsAgg] = userIds.length
            ? await Promise.all([
                Review.aggregate([
                    { $match: { providerId: { $in: userIds }, isDeleted: false } },
                    {
                        $group: {
                            _id: '$providerId',
                            avgRating: { $avg: '$rating' },
                            totalReviews: { $sum: 1 },
                        },
                    },
                ]),
                Job.aggregate([
                    {
                        $match: {
                            providerId: { $in: userIds },
                            status: { $in: ['completed', 'paid'] },
                            isDeleted: false,
                        },
                    },
                    {
                        $group: {
                            _id: '$providerId',
                            completedJobs: { $sum: 1 },
                        },
                    },
                ]),
            ])
            : [[], []];

        const reviewMap = new Map(
            reviewAgg.map((item) => [
                String(item._id),
                {
                    averageRating: Number((item.avgRating || 0).toFixed(2)),
                    totalReviews: Number(item.totalReviews || 0),
                },
            ]),
        );
        const completedJobsMap = new Map(
            completedJobsAgg.map((item) => [String(item._id), Number(item.completedJobs || 0)]),
        );

        const hydratedItems = items.map((item) => {
            const key = String(item?.userId?._id || item?.userId || '');
            const reviewStats = reviewMap.get(key) || {};
            const completedJobs = completedJobsMap.get(key);
            const base = item.toObject();
            return {
                ...base,
                stats: {
                    ...(base.stats || {}),
                    averageRating: reviewStats.averageRating ?? Number(base?.stats?.averageRating || 0),
                    completedJobs: completedJobs ?? Number(base?.stats?.completedJobs || 0),
                },
                totalReviews: reviewStats.totalReviews ?? 0,
            };
        });

        return sendResponse(res, { message: 'Providers', data: hydratedItems, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const jobQr = async (req, res, next) => {
    try {
        const job = await Job.findOne({ _id: req.params.jobId, providerId: req.user._id, isDeleted: false }).select('+qrTokenHash +qrTokenValue');
        if (!job) throw new Error('Job not found');
        const needsActiveQr = job.status === 'accepted' && !job.arrivedAt;

        if (!needsActiveQr) {
            return sendResponse(res, {
                message: 'QR info',
                data: {
                    jobId: job._id,
                    token: null,
                    expiresAt: job.qrTokenExpiresAt,
                    usedAt: job.qrTokenUsedAt,
                    status: job.status,
                },
            });
        }

        const qr = await generateJobQrToken(job._id, req.user._id);
        return sendResponse(res, {
            message: 'QR info',
            data: {
                jobId: job._id,
                token: qr.token,
                expiresAt: qr.expiresAt,
                usedAt: null,
                status: job.status,
            },
        });
    } catch (error) { next(error); }
};
