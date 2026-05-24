import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import Job from '../models/Job.model.js';
import Admin from '../models/Admin.model.js';

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

const ensureActiveUser = async (userId) => {
    const user = await User.findOne({ _id: userId, isDeleted: false, isActive: true }).select('_id');
    if (!user) {
        throw new Error('User not found');
    }
    return user;
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

const rolePriority = {
    support_admin: 1,
    super_admin: 2,
    finance_admin: 3,
};

export const findAvailableSupportAdmin = async () => {
    const admins = await Admin.find({
        isDeleted: false,
        isActive: true,
        role: { $in: ['support_admin', 'super_admin'] },
    }).select('_id name role createdAt');

    if (!admins.length) return null;

    return [...admins].sort((a, b) => {
        const aPriority = rolePriority[a.role] || 999;
        const bPriority = rolePriority[b.role] || 999;
        if (aPriority !== bPriority) return aPriority - bPriority;
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    })[0];
};

const resolveCounterpartMaps = async (counterpartIds = []) => {
    const [users, admins] = await Promise.all([
        User.find({ _id: { $in: counterpartIds } }).select('name profileImage'),
        Admin.find({ _id: { $in: counterpartIds }, isDeleted: false }).select('name role'),
    ]);

    return {
        usersMap: new Map(users.map((item) => [String(item._id), item])),
        adminsMap: new Map(admins.map((item) => [String(item._id), item])),
    };
};

export const listConversations = async (userId, options = {}) => {
    const { contextType = null } = options;
    const filter = {
        isDeleted: false,
        $or: [{ senderId: userId }, { receiverId: userId }],
    };

    if (contextType) {
        filter.contextType = contextType;
    }

    const messages = await Message.find(filter).sort({ createdAt: -1 });

    const latestByThread = new Map();
    for (const message of messages) {
        const counterpartId = String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId);
        const key = message.contextType === 'direct' ? `direct:${counterpartId}` : String(message.threadId);
        if (!latestByThread.has(key)) latestByThread.set(key, message);
    }

    const latestMessages = [...latestByThread.values()];
    const counterpartIds = [...new Set(latestMessages.map((message) => String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId)))];
    const jobIds = [...new Set(latestMessages.map((message) => message.jobId ? String(message.jobId) : '').filter(Boolean))];

    const [{ usersMap, adminsMap }, jobs, unreadCounts, directUnreadCounts] = await Promise.all([
        resolveCounterpartMaps(counterpartIds),
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

    const jobsMap = new Map(jobs.map((item) => [String(item._id), item]));
    const unreadMap = new Map(unreadCounts.map((item) => [String(item._id), item.count]));
    const directUnreadMap = new Map(directUnreadCounts.map((item) => [String(item._id), item.count]));

    return latestMessages
        .map((message) => {
            const counterpartId = String(String(message.senderId) === String(userId) ? message.receiverId : message.senderId);
            const counterpartUser = usersMap.get(counterpartId);
            const counterpartAdmin = adminsMap.get(counterpartId);
            const job = message.jobId ? jobsMap.get(String(message.jobId)) : null;
            const counterpartRole = counterpartUser ? 'user' : (counterpartAdmin ? 'admin' : 'unknown');

            return {
                threadId: message.contextType === 'direct'
                    ? buildThreadId(userId, counterpartId, null)
                    : message.threadId,
                contextType: message.contextType || (message.jobId ? 'job' : 'direct'),
                jobId: job ? String(job._id) : null,
                counterpartId,
                counterpartRole,
                counterpartName: counterpartUser?.name || counterpartAdmin?.name || 'User',
                counterpartAvatar: counterpartUser?.profileImage || '',
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

export const contactSupportAgent = async ({ userId, content }) => {
    const activeAdmins = await Admin.find({
        isDeleted: false,
        isActive: true,
        role: { $in: ['support_admin', 'super_admin'] },
    }).select('_id name role createdAt');

    if (!activeAdmins.length) {
        throw new Error('No support admin is available right now');
    }

    const activeAdminIds = activeAdmins.map((admin) => admin._id);
    const latestSupportMessage = await Message.findOne({
        isDeleted: false,
        contextType: 'direct',
        $or: [
            { senderId: userId, receiverId: { $in: activeAdminIds } },
            { receiverId: userId, senderId: { $in: activeAdminIds } },
        ],
    }).sort({ createdAt: -1 });

    let agent = null;
    if (latestSupportMessage) {
        const counterpartId = String(
            String(latestSupportMessage.senderId) === String(userId)
                ? latestSupportMessage.receiverId
                : latestSupportMessage.senderId
        );
        agent = activeAdmins.find((admin) => String(admin._id) === counterpartId) || null;
    }

    if (!agent) {
        agent = [...activeAdmins].sort((a, b) => {
            const aPriority = rolePriority[a.role] || 999;
            const bPriority = rolePriority[b.role] || 999;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        })[0];
    }

    if (!agent) {
        throw new Error('No support admin is available right now');
    }

    const message = await sendMessage({
        senderId: userId,
        receiverId: agent._id,
        content,
        jobId: null,
    });

    return {
        agent: {
            id: agent._id,
            name: agent.name,
            role: agent.role,
        },
        message,
    };
};

export const listAdminSupportConversations = async (adminId) => {
    const allConversations = await listConversations(adminId, { contextType: 'direct' });
    return allConversations.filter((conversation) => conversation.counterpartRole === 'user');
};

export const getAdminSupportThreadMessages = async ({ adminId, userId, page, limit, skip }) => {
    await ensureActiveUser(userId);
    return getThreadMessages({
        userA: adminId,
        userB: userId,
        jobId: null,
        page,
        limit,
        skip,
    });
};

export const sendSupportMessageFromAdmin = async ({ adminId, userId, content }) => {
    await ensureActiveUser(userId);
    return sendMessage({
        senderId: adminId,
        receiverId: userId,
        content,
        jobId: null,
    });
};

export const markSupportThreadReadByAdmin = async ({ threadId, adminId }) =>
    markThreadRead({ threadId, userId: adminId });
