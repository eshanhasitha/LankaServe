import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env';
import routes from './routes/index.routes';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.middleware';

const app = express();

app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/', (_req, res) => res.json({ success: true, message: 'LankaServe API running', data: null, pagination: null, errorCode: null }));
app.get(`${env.API_PREFIX}/health`, (_req, res) => res.json({ success: true, message: 'OK', data: { status: 'healthy' }, pagination: null, errorCode: null }));

app.use(env.API_PREFIX, routes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
