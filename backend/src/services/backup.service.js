import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import { google } from 'googleapis';
import { env } from '../config/env.js';
import Backup from '../models/Backup.model.js';

const BACKUP_SCHEMA_VERSION = 1;
const EXCLUDED_COLLECTIONS = new Set(['backuprecords', 'backups']);

const safeFilePart = (value) => String(value || 'lankaserve')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

const nowStamp = () => {
    const date = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return [
        date.getUTCFullYear(),
        pad(date.getUTCMonth() + 1),
        pad(date.getUTCDate()),
        pad(date.getUTCHours()),
        pad(date.getUTCMinutes()),
        pad(date.getUTCSeconds()),
    ].join('');
};

const parseServiceAccountJson = () => {
    if (!env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON) return null;

    const raw = env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON.trim();
    const decoded = raw.startsWith('{')
        ? raw
        : Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
};

const getDriveCredentials = () => {
    const fromJson = parseServiceAccountJson();
    if (fromJson?.client_email && fromJson?.private_key) {
        return fromJson;
    }

    if (!env.GOOGLE_DRIVE_CLIENT_EMAIL || !env.GOOGLE_DRIVE_PRIVATE_KEY) {
        throw new Error('Google Drive backup is not configured. Add service account credentials.');
    }

    return {
        client_email: env.GOOGLE_DRIVE_CLIENT_EMAIL,
        private_key: env.GOOGLE_DRIVE_PRIVATE_KEY,
    };
};

const hasDriveOAuthCredentials = () =>
    Boolean(
        env.GOOGLE_DRIVE_OAUTH_CLIENT_ID
        && env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET
        && env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN,
    );

const getDriveAuth = () => {
    if (hasDriveOAuthCredentials()) {
        const auth = new google.auth.OAuth2(
            env.GOOGLE_DRIVE_OAUTH_CLIENT_ID,
            env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET,
            env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI,
        );
        auth.setCredentials({ refresh_token: env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN });
        return { auth, mode: 'oauth' };
    }

    return {
        auth: new google.auth.GoogleAuth({
            credentials: getDriveCredentials(),
            scopes: ['https://www.googleapis.com/auth/drive'],
        }),
        mode: 'service_account',
    };
};

const getDriveClient = () => {
    const { auth, mode } = getDriveAuth();
    const drive = google.drive({ version: 'v3', auth });

    return { drive, mode };
};

const isDriveNotFoundError = (error) => Number(error?.code || error?.response?.status) === 404;

const isServiceAccountQuotaError = (error) => {
    const message = String(error?.message || error?.response?.data?.error?.message || '').toLowerCase();
    return message.includes('service accounts do not have storage quota');
};

const explainDriveAccessError = (error, target, mode = 'service_account') => {
    if (isServiceAccountQuotaError(error)) {
        const nextError = new Error(
            'Google Drive rejected the upload because service accounts do not have personal storage quota. ' +
            'Configure GOOGLE_DRIVE_OAUTH_CLIENT_ID, GOOGLE_DRIVE_OAUTH_CLIENT_SECRET, and GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN to upload with a real Drive user, or use a Google Shared Drive folder with the service account as a member.',
        );
        nextError.cause = error;
        return nextError;
    }

    if (!isDriveNotFoundError(error)) return error;

    const owner = mode === 'oauth'
        ? 'the Google account connected by GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN'
        : 'the backup service account';
    const nextError = new Error(
        `Google Drive ${target} was not found or is not shared with ${owner}. ` +
        'Check GOOGLE_DRIVE_FOLDER_ID and folder sharing permissions.',
    );
    nextError.cause = error;
    return nextError;
};

const assertDriveFolderAccess = async (drive, mode) => {
    if (!env.GOOGLE_DRIVE_FOLDER_ID) return null;

    try {
        const response = await drive.files.get({
            fileId: env.GOOGLE_DRIVE_FOLDER_ID,
            fields: 'id,name,mimeType',
            supportsAllDrives: true,
        });

        if (response.data?.mimeType !== 'application/vnd.google-apps.folder') {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID must point to a Google Drive folder.');
        }

        return response.data;
    } catch (error) {
        throw explainDriveAccessError(error, 'folder', mode);
    }
};

const uploadToDrive = async ({ filePath, fileName }) => {
    const { drive, mode } = getDriveClient();
    await assertDriveFolderAccess(drive, mode);

    const requestBody = {
        name: fileName,
        mimeType: 'application/json',
    };

    if (env.GOOGLE_DRIVE_FOLDER_ID) {
        requestBody.parents = [env.GOOGLE_DRIVE_FOLDER_ID];
    }

    try {
        const response = await drive.files.create({
            requestBody,
            media: {
                mimeType: 'application/json',
                body: fs.createReadStream(filePath),
            },
            fields: 'id,name,size,webViewLink,createdTime',
            supportsAllDrives: true,
        });

        return response.data;
    } catch (error) {
        throw explainDriveAccessError(error, 'folder', mode);
    }
};

const downloadFromDrive = async ({ fileId, filePath }) => {
    const { drive, mode } = getDriveClient();
    let response;
    try {
        response = await drive.files.get(
            { fileId, alt: 'media', supportsAllDrives: true },
            { responseType: 'stream' },
        );
    } catch (error) {
        throw explainDriveAccessError(error, 'backup file', mode);
    }

    await pipeline(response.data, fs.createWriteStream(filePath));
};

const listBackupCollections = async () => {
    const collections = await mongoose.connection.db.listCollections().toArray();

    return collections
        .map((item) => item.name)
        .filter((name) => name && !name.startsWith('system.') && !EXCLUDED_COLLECTIONS.has(name))
        .sort((a, b) => a.localeCompare(b));
};

const createSnapshot = async () => {
    const db = mongoose.connection.db;
    const names = await listBackupCollections();
    const collections = [];

    for (const name of names) {
        const documents = await db.collection(name).find({}).toArray();
        collections.push({
            name,
            documentCount: documents.length,
            documents,
        });
    }

    return {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        createdAt: new Date(),
        databaseName: mongoose.connection.name,
        collections,
        excludedCollections: Array.from(EXCLUDED_COLLECTIONS),
    };
};

export const listDatabaseBackups = async ({ page = 1, limit = 20 } = {}) => {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
        Backup.find({ isDeleted: false }).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
        Backup.countDocuments({ isDeleted: false }),
    ]);

    return {
        items,
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit) || 1,
        },
    };
};

export const createDatabaseBackup = async ({ adminId }) => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database is not connected');
    }

    const dbName = safeFilePart(mongoose.connection.name || 'lankaserve');
    const fileName = `${dbName}-backup-${nowStamp()}.json`;
    const tempPath = path.join(os.tmpdir(), fileName);

    const backup = await Backup.create({
        fileName,
        databaseName: mongoose.connection.name,
        status: 'pending',
        createdBy: adminId,
    });

    try {
        const snapshot = await createSnapshot();
        await fs.promises.writeFile(tempPath, EJSON.stringify(snapshot, null, 2, { relaxed: false }), 'utf8');

        const driveFile = await uploadToDrive({ filePath: tempPath, fileName });
        const stat = await fs.promises.stat(tempPath);

        backup.status = 'success';
        backup.driveFileId = driveFile.id || '';
        backup.driveWebViewLink = driveFile.webViewLink || '';
        backup.sizeBytes = Number(driveFile.size || stat.size || 0);
        backup.collections = snapshot.collections.map((collection) => ({
            name: collection.name,
            documentCount: collection.documentCount,
        }));
        backup.completedAt = new Date();
        await backup.save();

        return backup;
    } catch (error) {
        backup.status = 'failed';
        backup.error = error.message || 'Backup failed';
        backup.completedAt = new Date();
        await backup.save();
        throw error;
    } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
    }
};

export const restoreDatabaseBackup = async ({ backupId, adminId }) => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database is not connected');
    }

    const backup = await Backup.findOne({ _id: backupId, isDeleted: false });
    if (!backup) {
        throw new Error('Backup not found');
    }

    if (backup.status !== 'success' && backup.status !== 'restored') {
        throw new Error('Only successful backups can be restored');
    }

    if (!backup.driveFileId) {
        throw new Error('Backup Drive file ID is missing');
    }

    const tempPath = path.join(os.tmpdir(), `restore-${backup.driveFileId}-${Date.now()}.json`);
    backup.status = 'restoring';
    backup.restoredBy = adminId;
    backup.error = '';
    await backup.save();

    try {
        await downloadFromDrive({ fileId: backup.driveFileId, filePath: tempPath });
        const raw = await fs.promises.readFile(tempPath, 'utf8');
        const snapshot = EJSON.parse(raw, { relaxed: false });

        if (!snapshot || snapshot.schemaVersion !== BACKUP_SCHEMA_VERSION || !Array.isArray(snapshot.collections)) {
            throw new Error('Invalid backup snapshot format');
        }

        const db = mongoose.connection.db;
        const currentCollections = await listBackupCollections();
        const snapshotNames = new Set(snapshot.collections.map((collection) => collection.name));
        const collectionsToClear = Array.from(new Set([...currentCollections, ...snapshotNames]))
            .filter((name) => name && !EXCLUDED_COLLECTIONS.has(name));

        for (const name of collectionsToClear) {
            await db.collection(name).deleteMany({});
        }

        for (const collection of snapshot.collections) {
            if (!collection?.name || EXCLUDED_COLLECTIONS.has(collection.name)) continue;
            const documents = Array.isArray(collection.documents) ? collection.documents : [];
            if (documents.length) {
                await db.collection(collection.name).insertMany(documents, { ordered: false });
            }
        }

        backup.status = 'restored';
        backup.restoredAt = new Date();
        backup.restoredBy = adminId;
        await backup.save();

        return backup;
    } catch (error) {
        backup.status = 'success';
        backup.error = `Restore failed: ${error.message || 'unknown error'}`;
        await backup.save();
        throw error;
    } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
    }
};
