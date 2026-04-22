import jwt from 'jsonwebtoken';
import { sendFail } from '../utils/response';

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return sendFail(res, 401, 'Unauthorized', 'UNAUTHORIZED');

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET || 'dev_access_secret');
    req.user = { _id: payload.sub, role: payload.role };
    next();
  } catch {
    return sendFail(res, 401, 'Invalid token', 'UNAUTHORIZED');
  }
}
