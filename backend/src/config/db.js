import mongoose from 'mongoose';
import { env } from './env.js';
import { logger } from './logger.js';

let connectionPromise = null;

export const connectDB = async () => {
    if (!env.MONGO_URI) {
        throw new Error('MONGO_URI is not configured');
    }

    if (mongoose.connection.readyState === 1) {
        return mongoose.connection;
    }

    if (!connectionPromise) {
        connectionPromise = mongoose.connect(env.MONGO_URI, {
            serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS,
            socketTimeoutMS: env.MONGO_SOCKET_TIMEOUT_MS,
        }).then(() => {
            logger.info(`MongoDB connected: ${mongoose.connection.host}`);
            return mongoose.connection;
        }).catch((error) => {
            connectionPromise = null;
            throw error;
        });
    }

    return connectionPromise;
};
