import { sendResponse } from '../utils/response.js';
import { getPagination, buildPaginationMeta } from '../utils/pagination.js';
import { listMyNotifications, markNotificationRead, broadcastNotification } from '../services/notification.service.js';

export const myNotifications = async (req, res, next) => {
    try {
        const { page, limit, skip } = getPagination(req.query);
        const { items, total } = await listMyNotifications(req.user._id, { page, limit, skip });
        return sendResponse(res, { message: 'My notifications', data: items, pagination: buildPaginationMeta({ page, limit, total }) });
    } catch (error) { next(error); }
};

export const readNotification = async (req, res, next) => {
    try {
        const item = await markNotificationRead(req.user._id, req.params.id);
        return sendResponse(res, { message: 'Notification read', data: item });
    } catch (error) { next(error); }
};

export const adminBroadcast = async (req, res, next) => {
    try {
        const count = await broadcastNotification(req.body);
        return sendResponse(res, { message: 'Broadcast sent', data: { recipients: count } });
    } catch (error) { next(error); }
};
