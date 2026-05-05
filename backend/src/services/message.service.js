import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import Job from '../models/Job.model.js';

const bannedWords = ['spam', 'scam', 'fraud'];

const getParticipantKey = (a, b) => [String(a), String(b)].sort().join('_');
const buildThreadId = (a, b, jobId = null) =>
    jobId ? `job:${String(jobId)}:${getParticipantKey(a, b)}` : `direct:${getParticipantKey(a, b)}`;
const buildLegacyDirectThreadIds = (a, b) => {
    const first = String(a);
    const second = String(b);
    const ids = new Set([
        `direct:${first}_${second}`,
        `direct:${second}_${first}`,
        `direct:${getParticipantKey(first, second)}`,
    ]);
    return [...ids];
};

export const sendMessage = async ({ senderId, receiverId, content, jobId = null }) => {
    const lower = String(content).toLowerCase();
    if (bannedWords.some((w) => lower.includes(w))) {
        throw new Error('Message contains banned words');
    }

    const threadId = buildThreadId(senderId, receiverId, jobId);
    return Message.create({ senderId, receiverId, content, threadId, contextType: jobId ? 'job' : 'direct', jobId: jobId || null });
};

export const getThreadMessages = async ({ userA, userB, jobId = null, page, limit, skip }) => {
    const canonicalThreadId = buildThreadId(userA, userB, jobId);
    const filter = jobId
        ? { threadId: canonicalThreadId, isDeleted: false }
        : { threadId: { $in: buildLegacyDirectThreadIds(userA, userB) }, isDeleted: false };
    const [items, total] = await Promise.all([
        Message.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Message.countDocuments(filter),
    ]);
    return { items: items.reverse(), total, threadId: canonicalThreadId };
};

export const markThreadRead = async ({ threadId, userId }) => {
    let matchThread = threadId;
    if (String(threadId).startsWith('direct:')) {
        const participantKey = String(threadId).slice('direct:'.length);
        const [first, second] = participantKey.split('_');
        if (first && second) {
            matchThread = { $in: buildLegacyDirectThreadIds(first, second) };
        }
    }

    await Message.updateMany(
        { threadId: matchThread, receiverId: userId, isRead: false, isDeleted: false },
        { isRead: true, readAt: new Date() }
    );
};

export const listConversations = async (userId) => {
    const messages = await Message.find({
        isDeleted: false,
        $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    const latestByThread = new Map();
    for (const message of messages) {
        const counterpartId = String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId);
        const key = message.contextType === 'direct' ? `direct:${counterpartId}` : String(message.threadId);
        if (!latestByThread.has(key)) latestByThread.set(key, message);
    }

    const latestMessages = [...latestByThread.values()];
    const counterpartIds = [...new Set(latestMessages.map((message) => String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId)))];
    const jobIds = [...new Set(latestMessages.map((message) => message.jobId ? String(message.jobId) : '').filter(Boolean))];

    const [users, jobs, unreadCounts, directUnreadCounts] = await Promise.all([
        User.find({ _id: { $in: counterpartIds } }).select('name profileImage'),
        Job.find({ _id: { $in: jobIds } }).select('title category customerId providerId'),
        Message.aggregate([
            { $match: { isDeleted: false, receiverId: userId, isRead: false } },
            { $group: { _id: '$threadId', count: { $sum: 1 } } },
        ]),
        Message.aggregate([
            { $match: { isDeleted: false, contextType: 'direct', receiverId: userId, isRead: false } },
            { $group: { _id: '$senderId', count: { $sum: 1 } } },
        ]),
    ]);

    const usersMap = new Map(users.map((item) => [String(item._id), item]));
    const jobsMap = new Map(jobs.map((item) => [String(item._id), item]));
    const unreadMap = new Map(unreadCounts.map((item) => [String(item._id), item.count]));
    const directUnreadMap = new Map(directUnreadCounts.map((item) => [String(item._id), item.count]));

    return latestMessages
        .map((message) => {
            const counterpartId = String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId);
            const counterpart = usersMap.get(counterpartId);
            const job = message.jobId ? jobsMap.get(String(message.jobId)) : null;

            return {
                threadId: message.contextType === 'direct'
                    ? buildThreadId(userId, counterpartId, null)
                    : message.threadId,
                contextType: message.contextType || (message.jobId ? 'job' : 'direct'),
                jobId: job ? String(job._id) : null,
                counterpartId,
                counterpartName: counterpart?.name || 'User',
                counterpartAvatar: counterpart?.profileImage || '',
                jobTitle: job ? (job.title || job.category || 'Job Chat') : null,
                lastMessage: message.content,
                lastMessageAt: message.createdAt,
                unread: message.contextType === 'direct'
                    ? (directUnreadMap.get(counterpartId) || 0)
                    : (unreadMap.get(String(message.threadId)) || 0),
            };
        })
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
};
