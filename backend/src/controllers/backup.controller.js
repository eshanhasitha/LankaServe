import { sendResponse } from '../utils/response.js';
import { writeAuditLog } from '../services/audit.service.js';
import {
    createDatabaseBackup,
    listDatabaseBackups,
    restoreDatabaseBackup,
} from '../services/backup.service.js';

export const listBackups = async (req, res, next) => {
    try {
        const { items, pagination } = await listDatabaseBackups(req.query);
        return sendResponse(res, { message: 'Backups', data: items, pagination });
    } catch (error) {
        next(error);
    }
};

export const createBackup = async (req, res, next) => {
    try {
        const backup = await createDatabaseBackup({ adminId: req.admin._id });
        await writeAuditLog({
            actorId: req.admin._id,
            action: 'backup_create',
            entity: 'Backup',
            entityId: String(backup._id),
            metadata: {
                driveFileId: backup.driveFileId,
                sizeBytes: backup.sizeBytes,
                collectionCount: backup.collections?.length || 0,
            },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
        return sendResponse(res, { statusCode: 201, message: 'Backup created', data: backup });
    } catch (error) {
        await writeAuditLog({
            actorId: req.admin?._id,
            action: 'backup_create_failed',
            entity: 'Backup',
            metadata: { reason: error.message },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});
        next(error);
    }
};

export const restoreBackup = async (req, res, next) => {
    try {
        const backup = await restoreDatabaseBackup({
            backupId: req.params.id,
            adminId: req.admin._id,
        });
        await writeAuditLog({
            actorId: req.admin._id,
            action: 'backup_restore',
            entity: 'Backup',
            entityId: String(backup._id),
            metadata: {
                driveFileId: backup.driveFileId,
                restoredAt: backup.restoredAt,
            },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });
        return sendResponse(res, { message: 'Backup restored', data: backup });
    } catch (error) {
        await writeAuditLog({
            actorId: req.admin?._id,
            action: 'backup_restore_failed',
            entity: 'Backup',
            entityId: req.params.id,
            metadata: { reason: error.message },
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        }).catch(() => {});
        next(error);
    }
};
