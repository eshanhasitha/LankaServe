import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const generalLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/' || req.path.endsWith('/health'),
    message: {
        success: false,
        message: 'Too many requests, please try again later.',
        data: null,
        pagination: null,
        errorCode: 'RATE_LIMITED',
    },
});

export const authLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.AUTH_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        data: null,
        pagination: null,
        errorCode: 'AUTH_RATE_LIMITED',
    },
});
