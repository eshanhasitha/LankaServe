import Notification from '../models/Notification.model.js';
import User from '../models/User.model.js';
import Job from '../models/Job.model.js';
import { firebaseMessaging } from '../config/firebase.js';

const APP_TIME_ZONE = process.env.APP_TIME_ZONE || 'Asia/Colombo';
const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

const datePartsFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
});

const getValidDate = (value) => {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getAppDayKey = (date) => {
    const parts = datePartsFormatter.formatToParts(date).reduce((acc, part) => {
        if (part.type !== 'literal') acc[part.type] = part.value;
        return acc;
    }, {});

    return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
};

export const formatNotificationTimeLabel = (value, now = new Date()) => {
    const date = getValidDate(value);
    if (!date) return 'Just now';

    const diffMs = now.getTime() - date.getTime();
    if (diffMs < minuteMs) return 'Just now';

    if (diffMs < hourMs) {
        const minutes = Math.floor(diffMs / minuteMs);
        return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
    }

    const dayDiff = Math.floor((getAppDayKey(now) - getAppDayKey(date)) / dayMs);
    if (dayDiff <= 0) {
        const hours = Math.floor(diffMs / hourMs);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    if (dayDiff === 1) return 'Yesterday';
    if (dayDiff < 7) return `${dayDiff} days ago`;

    const weeks = Math.floor(dayDiff / 7);
    if (dayDiff < 30) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
        timeZone: APP_TIME_ZONE,
    });
};

export const formatNotificationReceivedLabel = (value, now = new Date()) => {
    const date = getValidDate(value);
    if (!date) return 'Just now';

    const time = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: APP_TIME_ZONE,
    });

    if (getAppDayKey(now) === getAppDayKey(date)) return `Today, ${time}`;

    const dateText = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
        timeZone: APP_TIME_ZONE,
    });

    return `${dateText}, ${time}`;
};

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

    const now = new Date();
    const enrichedItems = items.map((item) => {
        const key = String(item?.data?.jobId || '').trim();
        const job = jobsMap.get(key) || null;
        const eventAt = getValidDate(item.createdAt || item.updatedAt || item._id?.getTimestamp?.()) || now;
        return {
            ...item.toObject(),
            eventAt: eventAt.toISOString(),
            timeLabel: formatNotificationTimeLabel(eventAt, now),
            receivedLabel: formatNotificationReceivedLabel(eventAt, now),
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
