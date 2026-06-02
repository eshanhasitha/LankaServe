import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Job from '../models/Job.model.js';
import { firebaseMessaging } from '../config/firebase.js';

export const pushNotification = async ({ userId, title, body, type = 'system', language = 'en', data = {} }) => {
    const record = await Notification.create({ userId, title, body, type, language, data });

    const user = await User.findById(userId).select('fcmToken');
    if (firebaseMessaging && user?.fcmToken) {
        await firebaseMessaging.send({ token: user.fcmToken, notification: { title, body }, data });
    }

    return record;
};

export const listMyNotifications = async (userId, { page, limit, skip }) => {
    const filter = { userId, isDeleted: false };
    const [items, total] = await Promise.all([
        Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Notification.countDocuments(filter),
    ]);

    const jobIds = [
        ...new Set(
            items
                .map((item) => String(item?.data?.jobId || '').trim())
                .filter(Boolean),
        ),
    ];

    const jobs = jobIds.length
        ? await Job.find({ _id: { $in: jobIds }, isDeleted: false }).select('_id title status')
        : [];

    const jobsMap = new Map(
        jobs.map((job) => [
            String(job._id),
            {
                id: String(job._id),
                displayId: `#${String(job._id).slice(-6)}`,
                title: job.title || 'Job',
                status: job.status || '',
            },
        ]),
    );

    const enrichedItems = items.map((item) => {
        const key = String(item?.data?.jobId || '').trim();
        const job = jobsMap.get(key) || null;
        return {
            ...item.toObject(),
            job,
        };
    });

    return { items: enrichedItems, total };
};

export const markNotificationRead = async (userId, id) => {
    return Notification.findOneAndUpdate({ _id: id, userId, isDeleted: false }, { isRead: true }, { returnDocument: 'after' });
};

export const broadcastNotification = async ({ title, body, type = 'system' }) => {
    const users = await User.find({ isDeleted: false, isActive: true }).select('_id');
    if (!users.length) return 0;

    const docs = users.map((u) => ({ userId: u._id, title, body, type }));
    await Notification.insertMany(docs);
    return docs.length;
};
