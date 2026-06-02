import Payment from '../models/Payment.model.js';
import Job from '../models/Job.model.js';

const verifyIfComplete = async (payment) => {
    if (payment.providerPaid && payment.customerConfirmed) {
        payment.status = 'verified';
        payment.verifiedAt = new Date();
        await payment.save();

        const job = await Job.findById(payment.jobId);
        if (job) {
            job.status = 'paid';
            job.paidAt = new Date();
            await job.save();
        }
    }
    return payment;
};

export const initPayment = async (jobId) => {
    const job = await Job.findById(jobId);
    if (!job) throw new Error('Job not found');

    const existing = await Payment.findOne({ jobId, isDeleted: false });
    if (existing) return existing;

    return Payment.create({
        jobId,
        providerId: job.providerId,
        customerId: job.customerId,
        amount: job.price,
    });
};

export const providerPaid = async (jobId, providerId) => {
    const payment = await Payment.findOne({ jobId, providerId, isDeleted: false });
    if (!payment) throw new Error('Payment not found');
    payment.providerPaid = true;
    await payment.save();
    return verifyIfComplete(payment);
};

export const customerConfirm = async (jobId, customerId) => {
    const payment = await Payment.findOne({ jobId, customerId, isDeleted: false });
    if (!payment) throw new Error('Payment not found');
    payment.customerConfirmed = true;
    await payment.save();
    return verifyIfComplete(payment);
};

export const adminVerify = async (jobId) => {
    const payment = await Payment.findOne({ jobId, isDeleted: false });
    if (!payment) throw new Error('Payment not found');
    payment.adminVerified = true;
    payment.status = 'verified';
    payment.verifiedAt = new Date();
    await payment.save();

    const job = await Job.findById(jobId);
    if (job) {
        job.status = 'paid';
        job.paidAt = new Date();
        await job.save();
    }
    return payment;
};

export const getProviderPayments = async (providerId, { page, limit, skip }) => {
    const filter = { providerId, isDeleted: false };
    const [items, total] = await Promise.all([
        Payment.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Payment.countDocuments(filter),
    ]);
    return { items, total };
};
