import Notification from '../models/Notification.model.js';

export const pushNotification = (payload) => Notification.create(payload);
export const getMyNotifications = (userId) =>
  Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
export const markRead = (userId, id) =>
  Notification.findOneAndUpdate({ _id: id, userId }, { isRead: true }, { new: true });
export const markAllRead = (userId) =>
  Notification.updateMany({ userId, isRead: false }, { isRead: true });