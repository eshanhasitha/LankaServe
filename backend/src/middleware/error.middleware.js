import { logger } from '../config/logger.js';

export const errorMiddleware = (err, req, res, next) => {
    logger.error(err.message, { stack: err.stack, path: req.originalUrl });
    return res.status(err.statusCode || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        data: null,
        pagination: null,
        errorCode: err.errorCode || 'INTERNAL_ERROR',
    });
};
