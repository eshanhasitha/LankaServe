import Job from '../models/Job.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import Payment from '../models/Payment.model.js';
import User from '../models/User.model.js';

export const getHeatmap = async () => {
    const [jobs, providers] = await Promise.all([
        Job.find({ isDeleted: false }).select('location status category'),
        ServiceProvider.find({ isDeleted: false }).select('location verified categories'),
    ]);
    return { jobs, providers };
};

export const getOverview = async () => {
    const [jobs, users, providers, revenue] = await Promise.all([
        Job.countDocuments({ isDeleted: false }),
        User.countDocuments({ isDeleted: false }),
        ServiceProvider.countDocuments({ isDeleted: false }),
        Payment.aggregate([{ $match: { status: 'verified', isDeleted: false } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ]);

    return { totalJobs: jobs, totalUsers: users, totalProviders: providers, revenue: revenue[0]?.total || 0 };
};

export const getServiceDemand = async () => {
    return Job.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
    ]);
};
