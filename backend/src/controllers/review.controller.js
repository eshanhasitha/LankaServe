import Review from '../models/Review.model.js';
import Job from '../models/Job.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { recalculateProviderRanking } from '../services/ranking.service.js';
import { recomputeProviderStatsByUserId } from '../services/provider.service.js';
import { recalculateProviderBadges } from '../services/badge.service.js';

export const createReview = async (req, res, next) => {
    try {
        const job = await Job.findOne({ _id: req.body.jobId, customerId: req.user._id, status: { $in: ['completed', 'paid'] }, isDeleted: false });
        if (!job) throw new Error('Only completed jobs can be reviewed');

        const existing = await Review.findOne({ jobId: job._id, customerId: req.user._id, isDeleted: false });
        if (existing) throw new Error('You have already submitted a review for this job');

        const review = await Review.create({
            jobId: job._id,
            providerId: job.providerId,
            customerId: req.user._id,
            rating: req.body.rating,
            comment: req.body.comment || '',
        });

        const provider = await ServiceProvider.findOne({ userId: job.providerId, isDeleted: false }).select('_id');
        await recomputeProviderStatsByUserId(job.providerId);
        if (provider) {
            await recalculateProviderBadges(provider._id);
            await recalculateProviderRanking(provider._id);
        }

        return sendResponse(res, { statusCode: 201, message: 'Review created', data: review });
    } catch (error) { next(error); }
};

export const getMyJobReview = async (req, res, next) => {
    try {
        const review = await Review.findOne({
            jobId: req.params.jobId,
            customerId: req.user._id,
            isDeleted: false,
        });
        return sendResponse(res, { message: 'My job review', data: review });
    } catch (error) { next(error); }
};

export const getJobReview = async (req, res, next) => {
    try {
        const job = await Job.findOne({
            _id: req.params.jobId,
            isDeleted: false,
        }).select('customerId providerId preferredProviderId status');

        if (!job) throw new Error('Job not found');

        const requesterId = String(req.user?._id || '');
        const isCustomer = String(job.customerId || '') === requesterId;
        const isProvider = String(job.providerId || '') === requesterId;
        const isOpenProviderCandidate = req.user?.role === 'provider'
            && job.status === 'pending'
            && (!job.preferredProviderId || String(job.preferredProviderId) === requesterId);

        if (isOpenProviderCandidate) {
            return sendResponse(res, { message: 'Job review', data: null });
        }

        if (!isCustomer && !isProvider && req.user?.role !== 'admin') {
            throw new Error('You are not allowed to view this review');
        }

        const review = await Review.findOne({
            jobId: job._id,
            isDeleted: false,
        }).populate('customerId', 'name profileImage');

        return sendResponse(res, { message: 'Job review', data: review });
    } catch (error) { next(error); }
};

export const listProviderReviews = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = { providerId: req.params.providerId, isDeleted: false };
        const [items, total] = await Promise.all([
            Review.find(filter).populate('customerId', 'name profileImage').sort({ createdAt: -1 }).skip(skip).limit(limit),
            Review.countDocuments(filter),
        ]);
        return sendResponse(res, { message: 'Reviews', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const deleteReview = async (req, res, next) => {
    try {
        const review = await Review.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Review deleted', data: review });
    } catch (error) { next(error); }
};
