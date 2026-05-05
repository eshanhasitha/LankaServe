import ServiceProvider from '../models/ServiceProvider.model.js';
import Job from '../models/Job.model.js';
import Review from '../models/Review.model.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';

const DISTRICT_TO_PROVINCE = {
    ampara: 'Eastern',
    anuradhapura: 'North Central',
    badulla: 'Uva',
    batticaloa: 'Eastern',
    colombo: 'Western',
    galle: 'Southern',
    gampaha: 'Western',
    hambantota: 'Southern',
    jaffna: 'Northern',
    kalutara: 'Western',
    kandi: 'Central',
    kandy: 'Central',
    kegalle: 'Sabaragamuwa',
    kilinochchi: 'Northern',
    kurunegala: 'North Western',
    mannar: 'Northern',
    matale: 'Central',
    matara: 'Southern',
    monaragala: 'Uva',
    mullaitivu: 'Northern',
    nuwaraeliya: 'Central',
    nuwaraeliya: 'Central',
    polonnaruwa: 'North Central',
    puttalam: 'North Western',
    ratnapura: 'Sabaragamuwa',
    trincomalee: 'Eastern',
    vavuniya: 'Northern',
};

export const getSriLankaProvince = (district = '') => {
    const normalized = String(district || '').trim().toLowerCase();
    return DISTRICT_TO_PROVINCE[normalized] || '';
};

export const applyProvider = async (userId, body) => {
    const existing = await ServiceProvider.findOne({ userId, isDeleted: false });
    if (existing) return existing;
    return ServiceProvider.create({
        userId,
        categories: body.categories || [],
        bio: body.bio || '',
        yearsExperience: body.yearsExperience || 0,
        verificationDocs: body.verificationDocs || [],
        location: body.location || { type: 'Point', coordinates: [79.8612, 6.9271] },
    });
};

export const getProviderDashboard = async (userId) => {
    const completedStatuses = ['completed', 'paid'];
    const [pending, ongoing, completed, reviews, earningsAgg, latestCompletedJob, totalTrackedJobs] = await Promise.all([
        Job.countDocuments({ providerId: userId, status: 'accepted', isDeleted: false }),
        Job.countDocuments({ providerId: userId, status: { $in: ['arrived', 'ongoing'] }, isDeleted: false }),
        Job.countDocuments({ providerId: userId, status: { $in: completedStatuses }, isDeleted: false }),
        ServiceProvider.findOne({ userId, isDeleted: false }).select('stats'),
        Job.aggregate([{ $match: { providerId: userId, status: { $in: completedStatuses }, isDeleted: false } }, { $group: { _id: null, total: { $sum: '$price' } } }]),
        Job.findOne({ providerId: userId, status: { $in: completedStatuses }, isDeleted: false }).sort({ completedAt: -1, paidAt: -1, updatedAt: -1 }).select('price'),
        Job.countDocuments({ providerId: userId, status: { $in: ['accepted', 'arrived', 'ongoing', 'completed', 'paid', 'cancelled'] }, isDeleted: false }),
    ]);

    const earnings = Number(earningsAgg[0]?.total || 0);
    const latestAddedAmount = Number(latestCompletedJob?.price || 0);
    const earningsContributionPercent = earnings > 0 ? (latestAddedAmount / earnings) * 100 : 0;
    const successRate = totalTrackedJobs > 0 ? (completed / totalTrackedJobs) * 100 : 0;

    return {
        pending,
        ongoing,
        completed,
        rating: reviews?.stats?.averageRating || 0,
        earnings,
        latestAddedAmount,
        earningsContributionPercent: Number(earningsContributionPercent.toFixed(1)),
        successRate: Number(successRate.toFixed(1)),
    };
};

export const listProviderJobs = async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    let statusFilter = {};
    if (query.status) {
        const statuses = String(query.status)
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean);
        statusFilter = statuses.length > 1 ? { status: { $in: statuses } } : { status: statuses[0] };
    }
    const filter = { providerId: userId, isDeleted: false, ...statusFilter };
    const [items, total] = await Promise.all([
        Job.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'name profileImage email')
            .populate('providerId', 'name profileImage email'),
        Job.countDocuments(filter),
    ]);
    return { items, pagination: buildPaginationMeta({ page, limit, total }) };
};

export const browseOpenJobs = async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    const provider = await ServiceProvider.findOne({ userId, isDeleted: false });

    const filter = { status: 'pending', isDeleted: false, preferredProviderId: null };
    if (query.category) {
        filter.category = query.category;
    } else if (provider?.categories?.length) {
        filter.category = { $in: provider.categories };
    }

    if (query.minPrice || query.maxPrice) {
        filter.price = {};
        if (query.minPrice) filter.price.$gte = Number(query.minPrice);
        if (query.maxPrice) filter.price.$lte = Number(query.maxPrice);
    }

    const [items, total] = await Promise.all([
        Job.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'name profileImage district city email'),
        Job.countDocuments(filter),
    ]);

    return { items, pagination: buildPaginationMeta({ page, limit, total }) };
};

export const listProviderHiringRequests = async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    const filter = { status: 'pending', isDeleted: false, preferredProviderId: userId };

    const [items, total] = await Promise.all([
        Job.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('customerId', 'name profileImage district city email'),
        Job.countDocuments(filter),
    ]);

    return { items, pagination: buildPaginationMeta({ page, limit, total }) };
};

export const providerEarnings = async (userId, query) => {
    const { page, limit, skip } = getPagination(query);
    const parsedMonths = Number(query?.periodMonths || 6);
    const periodMonths = parsedMonths === 12 ? 12 : 6;
    const completedStatuses = ['completed', 'paid'];
    const filter = { providerId: userId, status: { $in: completedStatuses }, isDeleted: false };
    const trendStart = new Date();
    trendStart.setUTCDate(1);
    trendStart.setUTCHours(0, 0, 0, 0);
    trendStart.setUTCMonth(trendStart.getUTCMonth() - (periodMonths - 1));
    const currentMonthStart = new Date();
    currentMonthStart.setUTCDate(1);
    currentMonthStart.setUTCHours(0, 0, 0, 0);
    const previousMonthStart = new Date(Date.UTC(currentMonthStart.getUTCFullYear(), currentMonthStart.getUTCMonth() - 1, 1));

    const [items, total, weekly, monthly, lifetime, previousMonth, latestCompletedJob] = await Promise.all([
        Job.find(filter).sort({ completedAt: -1, paidAt: -1, updatedAt: -1 }).skip(skip).limit(limit).select('title price status completedAt paidAt createdAt'),
        Job.countDocuments(filter),
        Job.aggregate([
            { $match: { ...filter, completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        Job.aggregate([
            { $match: { ...filter, completedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        Job.aggregate([
            { $match: filter },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        Job.aggregate([
            { $match: { ...filter, completedAt: { $gte: previousMonthStart, $lt: currentMonthStart } } },
            { $group: { _id: null, total: { $sum: '$price' } } },
        ]),
        Job.findOne(filter).sort({ completedAt: -1, paidAt: -1, updatedAt: -1 }).select('price'),
    ]);

    const trendAggregation = await Job.aggregate([
        { $match: { ...filter, completedAt: { $gte: trendStart } } },
        {
            $group: {
                _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } },
                amount: { $sum: '$price' },
                jobs: { $sum: 1 },
            },
        },
    ]);

    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendMap = new Map(
        trendAggregation.map((item) => [`${item._id.year}-${item._id.month}`, { amount: item.amount || 0, jobs: item.jobs || 0 }])
    );
    const trend = [];
    const now = new Date();
    for (let index = periodMonths - 1; index >= 0; index -= 1) {
        const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
        const key = `${current.getUTCFullYear()}-${current.getUTCMonth() + 1}`;
        const entry = trendMap.get(key) || { amount: 0, jobs: 0 };
        trend.push({
            key,
            label: monthLabels[current.getUTCMonth()],
            amount: Number(entry.amount || 0),
            jobs: Number(entry.jobs || 0),
        });
    }

    const normalizedItems = items.map((item) => ({
        _id: item._id,
        amount: Number(item.price || 0),
        status: 'verified',
        createdAt: item.completedAt || item.paidAt || item.createdAt,
        jobTitle: item.title || 'Service Payment',
        sourceStatus: item.status,
    }));

    const lifetimeTotal = Number(lifetime[0]?.total || 0);
    const currentMonthTotal = Number(monthly[0]?.total || 0);
    const previousMonthTotal = Number(previousMonth[0]?.total || 0);
    const latestAddedAmount = Number(latestCompletedJob?.price || 0);
    const latestContributionPercent = lifetimeTotal > 0 ? (latestAddedAmount / lifetimeTotal) * 100 : 0;
    const monthlyGrowthPercent = previousMonthTotal > 0
        ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
        : currentMonthTotal > 0
            ? 100
            : 0;

    return {
        items: normalizedItems,
        summary: {
            weekly: weekly[0]?.total || 0,
            monthly: currentMonthTotal,
            lifetime: lifetimeTotal,
            latestAddedAmount,
            latestContributionPercent: Number(latestContributionPercent.toFixed(1)),
            monthlyGrowthPercent: Number(monthlyGrowthPercent.toFixed(1)),
            trendPeriodMonths: periodMonths,
            trend,
        },
        pagination: buildPaginationMeta({ page, limit, total }),
    };
};

export const listSuggestedJobs = async (userId, limit = 20) => {
    const provider = await ServiceProvider.findOne({ userId, isDeleted: false }).select('categories district city location');
    if (!provider) return [];

    const filter = { status: 'pending', isDeleted: false };
    if (provider.categories?.length) {
        filter.category = { $in: provider.categories };
    }

    const providerProvince = getSriLankaProvince(provider.district);
    const items = await Job.find(filter)
        .sort({ createdAt: -1 })
        .limit(100)
        .populate('customerId', 'name district city location');

    const filtered = providerProvince
        ? items.filter((job) => getSriLankaProvince(job.customerId?.district) === providerProvince)
        : items;

    return filtered.slice(0, limit);
};

const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const resolvePeriodMonths = (value) => {
    const parsed = Number(value || 6);
    return parsed === 12 ? 12 : 6;
};

const buildMonthlyBuckets = (periodMonths, now = new Date()) => {
    const buckets = [];
    for (let index = periodMonths - 1; index >= 0; index -= 1) {
        const current = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1));
        buckets.push({
            key: `${current.getUTCFullYear()}-${current.getUTCMonth() + 1}`,
            label: monthLabels[current.getUTCMonth()],
            year: current.getUTCFullYear(),
            month: current.getUTCMonth() + 1,
        });
    }
    return buckets;
};

export const getProviderAnalytics = async (userId, query = {}) => {
    const periodMonths = resolvePeriodMonths(query.periodMonths);
    const trendStart = new Date();
    trendStart.setUTCDate(1);
    trendStart.setUTCHours(0, 0, 0, 0);
    trendStart.setUTCMonth(trendStart.getUTCMonth() - (periodMonths - 1));

    const completedStatuses = ['completed', 'paid'];
    const activeStatuses = ['accepted', 'arrived', 'ongoing', 'completed', 'paid'];

    const [
        provider,
        totalJobs,
        completedJobs,
        cancelledJobs,
        responseTimeAgg,
        repeatCustomersAgg,
        completionTrendAgg,
        earningsTrendAgg,
        ratingTrendAgg,
    ] = await Promise.all([
        ServiceProvider.findOne({ userId, isDeleted: false }).select('stats'),
        Job.countDocuments({ providerId: userId, isDeleted: false }),
        Job.countDocuments({ providerId: userId, status: { $in: completedStatuses }, isDeleted: false }),
        Job.countDocuments({ providerId: userId, status: 'cancelled', isDeleted: false }),
        Job.aggregate([
            { $match: { providerId: userId, isDeleted: false, responseTimeMinutes: { $ne: null } } },
            { $group: { _id: null, avg: { $avg: '$responseTimeMinutes' } } },
        ]),
        Job.aggregate([
            { $match: { providerId: userId, isDeleted: false, status: { $in: activeStatuses } } },
            { $group: { _id: '$customerId', jobs: { $sum: 1 } } },
            { $group: { _id: null, repeat: { $sum: { $cond: [{ $gt: ['$jobs', 1] }, 1, 0] } }, totalCustomers: { $sum: 1 } } },
        ]),
        Job.aggregate([
            { $match: { providerId: userId, isDeleted: false, status: { $in: completedStatuses }, completedAt: { $gte: trendStart } } },
            { $group: { _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } }, total: { $sum: 1 } } },
        ]),
        Job.aggregate([
            { $match: { providerId: userId, isDeleted: false, status: { $in: completedStatuses }, completedAt: { $gte: trendStart } } },
            { $group: { _id: { year: { $year: '$completedAt' }, month: { $month: '$completedAt' } }, total: { $sum: '$price' } } },
        ]),
        Review.aggregate([
            { $match: { providerId: userId, isDeleted: false, createdAt: { $gte: trendStart } } },
            { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }, avgRating: { $avg: '$rating' } } },
        ]),
    ]);

    const completionRate = totalJobs ? (completedJobs / totalJobs) * 100 : 0;
    const cancellationRate = totalJobs ? (cancelledJobs / totalJobs) * 100 : 0;
    const averageRating = Number(provider?.stats?.averageRating || 0);
    const avgResponseTimeMinutes = Number(responseTimeAgg[0]?.avg || provider?.stats?.avgResponseTimeMinutes || 0);
    const responseEfficiency = avgResponseTimeMinutes <= 0
        ? 0
        : avgResponseTimeMinutes <= 5
            ? 100
            : avgResponseTimeMinutes <= 15
                ? 85
                : avgResponseTimeMinutes <= 30
                    ? 70
                    : 50;
    const repeatCustomers = Number(repeatCustomersAgg[0]?.repeat || 0);
    const uniqueCustomers = Number(repeatCustomersAgg[0]?.totalCustomers || 0);
    const repeatClientRate = uniqueCustomers ? (repeatCustomers / uniqueCustomers) * 100 : 0;

    const completionMap = new Map(completionTrendAgg.map((item) => [`${item._id.year}-${item._id.month}`, Number(item.total || 0)]));
    const earningsMap = new Map(earningsTrendAgg.map((item) => [`${item._id.year}-${item._id.month}`, Number(item.total || 0)]));
    const ratingMap = new Map(ratingTrendAgg.map((item) => [`${item._id.year}-${item._id.month}`, Number(item.avgRating || 0)]));

    const buckets = buildMonthlyBuckets(periodMonths);
    const completionTrend = buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        value: completionMap.get(bucket.key) || 0,
    }));
    const earningsTrend = buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        value: earningsMap.get(bucket.key) || 0,
    }));
    const ratingTrend = buckets.map((bucket) => ({
        key: bucket.key,
        label: bucket.label,
        value: Number((ratingMap.get(bucket.key) || 0).toFixed(2)),
    }));

    return {
        periodMonths,
        summary: {
            averageRating: Number(averageRating.toFixed(2)),
            avgResponseTimeMinutes: Number(avgResponseTimeMinutes.toFixed(1)),
            successRate: Number(completionRate.toFixed(1)),
            completedJobs,
            totalJobs,
            cancelledRate: Number(cancellationRate.toFixed(1)),
            repeatClientRate: Number(repeatClientRate.toFixed(1)),
            responseEfficiency,
        },
        trends: {
            completion: completionTrend,
            earnings: earningsTrend,
            rating: ratingTrend,
        },
    };
};

export const recomputeProviderStatsByUserId = async (userId) => {
    const provider = await ServiceProvider.findOne({ userId, isDeleted: false });
    if (!provider) return null;

    const [completedJobs, acceptedJobs, avgResponse, reviews] = await Promise.all([
        Job.countDocuments({ providerId: userId, status: { $in: ['completed', 'paid'] }, isDeleted: false }),
        Job.countDocuments({ providerId: userId, status: { $in: ['accepted', 'arrived', 'ongoing', 'completed', 'paid'] }, isDeleted: false }),
        Job.aggregate([
            { $match: { providerId: userId, responseTimeMinutes: { $ne: null }, isDeleted: false } },
            { $group: { _id: null, avg: { $avg: '$responseTimeMinutes' } } },
        ]),
        Review.aggregate([
            { $match: { providerId: userId, isDeleted: false } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]),
    ]);

    const completionRate = acceptedJobs === 0 ? 0 : completedJobs / acceptedJobs;
    const avgResponseTime = avgResponse[0]?.avg || 9999;

    provider.stats.completedJobs = completedJobs;
    provider.stats.completionRate = completionRate;
    provider.stats.averageRating = Number((reviews[0]?.avgRating || 0).toFixed(2));
    provider.stats.avgResponseTimeMinutes = Number(avgResponseTime.toFixed(2));
    provider.stats.responseSpeedScore = avgResponseTime <= 5 ? 1 : avgResponseTime <= 15 ? 0.7 : 0.3;

    await provider.save();
    return provider;
};
