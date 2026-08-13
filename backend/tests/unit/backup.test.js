import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Backup from '../../src/models/Backup.model.js';
import User from '../../src/models/User.model.js';
import Admin from '../../src/models/Admin.model.js';
import AuditLog from '../../src/models/AuditLog.model.js';
import { createDatabaseBackup, restoreDatabaseBackup } from '../../src/services/backup.service.js';

describe('Backup service create and restore tests', () => {
    let mongoServer;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        await mongoose.connect(uri);
    });

    afterAll(async () => {
        if (mongoose.connection.readyState) {
            await mongoose.connection.close();
        }
        if (mongoServer) {
            await mongoServer.stop();
        }
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Admin.deleteMany({});
        await AuditLog.deleteMany({});
        await Backup.deleteMany({});
    });

    it('should create backup locally and restore database while preserving restoring admin and audit logs', async () => {
        const admin = await Admin.create({
            email: 'admin_test@example.com',
            passwordHash: 'hashedpassword123',
            name: 'Test Admin',
            role: 'super_admin',
        });

        const user = await User.create({
            firebaseUid: 'uid_test_1',
            email: 'user1@example.com',
            name: 'User One',
            role: 'customer',
        });

        await AuditLog.create({
            actorId: admin._id,
            action: 'test_event',
            entity: 'System',
        });

        // Create database backup using service function
        const backup = await createDatabaseBackup({ adminId: admin._id });
        expect(backup.status).toBe('success');
        expect(backup.localFilePath).toBeTruthy();
        expect(fs.existsSync(backup.localFilePath)).toBe(true);

        // Add a new user after backup was created
        await User.create({
            firebaseUid: 'uid_test_2',
            email: 'user2@example.com',
            name: 'User Two',
            role: 'customer',
        });
        expect(await User.countDocuments()).toBe(2);

        // Restore backup using service function
        const restoredBackup = await restoreDatabaseBackup({
            backupId: backup._id,
            adminId: admin._id,
        });

        expect(restoredBackup.status).toBe('restored');

        // Verify user count reverted to 1 (only user1 from snapshot)
        const users = await User.find({});
        expect(users.length).toBe(1);
        expect(users[0].email).toBe('user1@example.com');

        // Verify restoring admin is preserved
        const restoredAdmin = await Admin.findById(admin._id);
        expect(restoredAdmin).not.toBeNull();
        expect(restoredAdmin.email).toBe('admin_test@example.com');

        // Verify audit log is preserved (excluded collection)
        const logs = await AuditLog.find({});
        expect(logs.length).toBe(1);

        // Clean up local backup file created in test
        if (backup.localFilePath && fs.existsSync(backup.localFilePath)) {
            await fs.promises.unlink(backup.localFilePath).catch(() => {});
        }
    });
});
