import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';

import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/index.routes.js';
import { generalLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
const app = express();

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({
    origin: env.CORS_ORIGINS.includes('*') ? true : env.CORS_ORIGINS,
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(generalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use((req, res, next) => {
    const sanitize = (value) => {
        if (typeof value === 'string') return value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '').trim();
        if (!value || typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(sanitize);
        return Object.entries(value).reduce((acc, [k, v]) => {
            if (k.startsWith('$') || k.includes('.')) return acc;
            acc[k] = sanitize(v);
            return acc;
        }, {});
    };

    req.body = sanitize(req.body || {});
    req.safeQuery = sanitize(req.query || {});
    next();
});

app.get('/', (req, res) => {
    res.status(200).json({ success: true, message: 'LankaServe backend running', data: { health: `${env.API_PREFIX}/health` }, pagination: null, errorCode: null });
});

app.get(`${env.API_PREFIX}/health`, (req, res) => {
    res.status(200).json({ success: true, message: 'OK', data: { status: 'healthy' }, pagination: null, errorCode: null });
});

app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Database connection failed',
            data: null,
            pagination: null,
            errorCode: 'DB_UNAVAILABLE',
            details: env.NODE_ENV === 'production' ? undefined : error.message,
        });
    }
});

app.use(env.API_PREFIX, apiRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
