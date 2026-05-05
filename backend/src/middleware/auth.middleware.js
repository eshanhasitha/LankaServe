import User from '../models/User.model.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const requireAuth = async (req, res, next) => {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) {
            return res.status(401).json({ success: false, message: 'Unauthorized', data: null, pagination: null, errorCode: 'UNAUTHORIZED' });
        }

        const payload = verifyAccessToken(token);
        const user = await User.findById(payload.sub || payload.userId || payload.id);
        if (!user || user.isDeleted || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid user', data: null, pagination: null, errorCode: 'UNAUTHORIZED' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: 'Invalid token', data: null, pagination: null, errorCode: 'UNAUTHORIZED' });
    }
};
