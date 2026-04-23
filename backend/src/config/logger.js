import winston from 'winston';
import { env } from './env.js';

export const logger = winston.createLogger({
    level: env.LOG_LEVEL,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: env.NODE_ENV === 'production'
                ? winston.format.json()
                : winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
    ],
});
