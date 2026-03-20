import User from '../models/User.model.js';
import { verifyAccessToken } from '../utils/tokens.js';

export async function requireAuth(req, res, next) {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Unauthorized' });

    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (!user) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
}
