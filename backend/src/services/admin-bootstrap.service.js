import Admin from '../models/Admin.model.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { hashPassword } from '../utils/password.js';

const ADMIN_ROLES = ['super_admin', 'support_admin', 'finance_admin'];

export const upsertAdminAccount = async ({
    email,
    password,
    name = 'System Admin',
    role = 'super_admin',
    resetSessions = true,
} = {}) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const plainPassword = String(password || '');

    if (!normalizedEmail || !plainPassword) {
        throw new Error('Admin email and password are required');
    }

    const safeRole = ADMIN_ROLES.includes(role) ? role : 'super_admin';
    const passwordHash = await hashPassword(plainPassword);

    return Admin.findOneAndUpdate(
        { email: normalizedEmail },
        {
            $set: {
                name: String(name || 'System Admin').trim(),
                role: safeRole,
                passwordHash,
                isActive: true,
                isDeleted: false,
                deletedAt: null,
                ...(resetSessions ? { refreshTokens: [] } : {}),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
        },
        { upsert: true, returnDocument: 'after' },
    ).select('+passwordHash +refreshTokens');
};

export const bootstrapAdminAccount = async () => {
    if (!env.ADMIN_BOOTSTRAP_ENABLED) return null;

    if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
        logger.warn('Admin bootstrap is enabled but ADMIN_EMAIL or ADMIN_PASSWORD is missing');
        return null;
    }

    const admin = await upsertAdminAccount({
        email: env.ADMIN_EMAIL,
        password: env.ADMIN_PASSWORD,
        name: env.ADMIN_NAME,
        role: env.ADMIN_ROLE,
        resetSessions: true,
    });

    logger.info(`Admin bootstrap ready: ${admin.email} (${admin.role})`);
    return admin;
};
