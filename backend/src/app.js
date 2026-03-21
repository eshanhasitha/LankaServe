import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import apiRoutes from './routes/index.routes.js';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.json({ success: true, message: 'Backend running' }));
app.get('/api/health', (req, res) => res.json({ success: true, message: 'OK' }));

app.use(env.API_PREFIX, apiRoutes);

export default app;