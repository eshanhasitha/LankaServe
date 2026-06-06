import dotenv from 'dotenv';

dotenv.config();

const required = ['MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

if (process.env.NODE_ENV === 'production') {
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        throw new Error(`Missing env vars: ${missing.join(', ')}`);
    }
}

const splitList = (input, fallback = '*') => {
    if (!input) return [fallback];
    return input.split(',').map((x) => x.trim()).filter(Boolean);
};

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: Number(process.env.PORT || 5000),
    API_PREFIX: process.env.API_PREFIX || '/api',
    MONGO_URI: process.env.MONGO_URI || '',
    MONGO_SERVER_SELECTION_TIMEOUT_MS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 5000),
    MONGO_SOCKET_TIMEOUT_MS: Number(process.env.MONGO_SOCKET_TIMEOUT_MS || 10000),
    CORS_ORIGINS: splitList(process.env.CORS_ORIGINS),
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 1000),
    AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX || 100),
    JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'dev_access_secret',
    JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    ADMIN_BOOTSTRAP_ENABLED: String(process.env.ADMIN_BOOTSTRAP_ENABLED || '').toLowerCase() === 'true',
    ADMIN_EMAIL: process.env.ADMIN_EMAIL || '',
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
    ADMIN_NAME: process.env.ADMIN_NAME || 'System Admin',
    ADMIN_ROLE: process.env.ADMIN_ROLE || 'super_admin',
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
    FIREBASE_PRIVATE_KEY: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON || '',
    GOOGLE_DRIVE_CLIENT_EMAIL: process.env.GOOGLE_DRIVE_CLIENT_EMAIL || '',
    GOOGLE_DRIVE_PRIVATE_KEY: (process.env.GOOGLE_DRIVE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    GOOGLE_DRIVE_OAUTH_CLIENT_ID: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_ID || '',
    GOOGLE_DRIVE_OAUTH_CLIENT_SECRET: process.env.GOOGLE_DRIVE_OAUTH_CLIENT_SECRET || '',
    GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN: process.env.GOOGLE_DRIVE_OAUTH_REFRESH_TOKEN || '',
    GOOGLE_DRIVE_OAUTH_REDIRECT_URI: process.env.GOOGLE_DRIVE_OAUTH_REDIRECT_URI || 'http://localhost',
    GOOGLE_DRIVE_FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    QR_TOKEN_EXPIRY_MINUTES: Number(process.env.QR_TOKEN_EXPIRY_MINUTES || 15),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};
