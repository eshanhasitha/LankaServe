import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import {
    sendMessage,
    getThreadMessages,
    markThreadRead,
    listConversations,
    contactSupportAgent,
    listAdminSupportConversations,
    getAdminSupportThreadMessages,
    sendSupportMessageFromAdmin,
    markSupportThreadReadByAdmin,
} from '../services/message.service.js';

export const send = async (req, res, next) => {
    try {
        const message = await sendMessage({ senderId: req.user._id, receiverId: req.body.receiverId, content: req.body.content, jobId: req.body.jobId || null });
        return sendResponse(res, { statusCode: 201, message: 'Message sent', data: message });
    } catch (error) { next(error); }
};

export const conversations = async (req, res, next) => {
    try {
        const data = await listConversations(req.user._id);
        return sendResponse(res, { message: 'Conversations', data });
    } catch (error) { next(error); }
};

export const thread = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const data = await getThreadMessages({ userA: req.user._id, userB: req.params.userId, jobId: req.query.jobId || null, page, limit, skip });
        return sendResponse(res, { message: 'Thread messages', data: data.items, pagination: buildPaginationMeta({ page, limit, total: data.total }) });
    } catch (error) { next(error); }
};

export const readThread = async (req, res, next) => {
    try {
        await markThreadRead({ threadId: req.params.threadId, userId: req.user._id });
        return sendResponse(res, { message: 'Thread marked read' });
    } catch (error) { next(error); }
};

export const contactAgent = async (req, res, next) => {
    try {
        const data = await contactSupportAgent({
            userId: req.user._id,
            content: req.body.content,
        });
        return sendResponse(res, { statusCode: 201, message: 'Connected to support agent', data });
    } catch (error) { next(error); }
};

export const adminSupportConversations = async (req, res, next) => {
    try {
        const data = await listAdminSupportConversations(req.admin._id);
        return sendResponse(res, { message: 'Support conversations', data });
    } catch (error) { next(error); }
};

export const adminSupportThread = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const data = await getAdminSupportThreadMessages({
            adminId: req.admin._id,
            userId: req.params.userId,
            page,
            limit,
            skip,
        });
        return sendResponse(res, {
            message: 'Support thread messages',
            data: data.items,
            pagination: buildPaginationMeta({ page, limit, total: data.total }),
        });
    } catch (error) { next(error); }
};

export const adminSendSupportMessage = async (req, res, next) => {
    try {
        const message = await sendSupportMessageFromAdmin({
            adminId: req.admin._id,
            userId: req.body.userId,
            content: req.body.content,
        });
        return sendResponse(res, { statusCode: 201, message: 'Support message sent', data: message });
    } catch (error) { next(error); }
};

export const adminReadSupportThread = async (req, res, next) => {
    try {
        await markSupportThreadReadByAdmin({
            threadId: req.params.threadId,
            adminId: req.admin._id,
        });
        return sendResponse(res, { message: 'Support thread marked read' });
    } catch (error) { next(error); }
};
