import 'express';

export function notFoundMiddleware(req, res) {
  res.status(404).json({ success: false, message: 'Route not found', data: null, pagination: null, errorCode: 'NOT_FOUND' });
}

export function errorMiddleware(err, _req, res, _next) {
  const status = err?.statusCode || 500;
  const message = err?.message || 'Internal server error';
  res.status(status).json({ success: false, message, data: null, pagination: null, errorCode: err?.errorCode || 'SERVER_ERROR' });
}
