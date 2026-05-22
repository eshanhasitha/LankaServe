import mongoose from 'mongoose';
import { env } from '../config/env.js';
import Admin from '../models/Admin.model.js';
import { hashPassword } from './password.js';

const [, , emailArg, passwordArg, nameArg, roleArg] = process.argv;

const email = String(emailArg || '').trim().toLowerCase();
const password = String(passwordArg || '');
const name = String(nameArg || 'System Admin').trim();
const role = ['super_admin', 'support_admin', 'finance_admin'].includes(roleArg)
    ? roleArg
    : 'super_admin';

const run = async () => {
    if (!email || !password) {
        throw new Error('Usage: npm -C backend run create-admin -- <email> <password> [name] [role]');
    }

    await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
        socketTimeoutMS: env.MONGO_SOCKET_TIMEOUT_MS,
    });

    const passwordHash = await hashPassword(password);
    const admin = await Admin.findOneAndUpdate(
        { email, isDeleted: false },
        {
            $set: {
                name,
                role,
                passwordHash,
                isActive: true,
                updatedAt: new Date(),
            },
            $setOnInsert: {
                createdAt: new Date(),
            },
        },
        { upsert: true, returnDocument: 'after' }
    ).select('+passwordHash +refreshTokens');

    console.log(`Admin ready: ${admin.email} (${admin.role})`);
    await mongoose.connection.close();
};

run().catch(async (error) => {
    console.error('Create admin failed:', error.message);
    if (mongoose.connection.readyState) await mongoose.connection.close();
    process.exit(1);
});
