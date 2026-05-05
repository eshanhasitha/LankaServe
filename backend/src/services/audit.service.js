import AuditLog from '../models/AuditLog.model.js';

export const writeAuditLog = async ({ actorId = null, action, entity, entityId = '', metadata = {}, ip = '', userAgent = '' }) => {
    return AuditLog.create({ actorId, action, entity, entityId, metadata, ip, userAgent });
};
