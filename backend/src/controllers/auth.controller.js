import { sendResponse } from '../utils/response.js';
import { registerWithFirebaseToken, loginWithFirebaseToken, refreshAccessToken, logoutByRefreshToken } from '../services/auth.service.js';
import { writeAuditLog } from '../services/audit.service.js';

export const register = async (req, res, next) => {
    try {
        const { firebaseIdToken, role, providerProfile } = req.body;
        const result = await registerWithFirebaseToken(firebaseIdToken, role, providerProfile);

        await writeAuditLog({
            actorId: result.user._id,
            action: 'signup',
            entity: 'auth',
            entityId: String(result.user._id),
            ip: req.ip,
            userAgent: req.headers['user-agent'] || '',
        });

        return sendResponse(res, { statusCode: 201, message: 'Registration successful', data: result });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { firebaseIdToken } = req.body;
        const result = await loginWithFirebaseToken(firebaseIdToken);

        await writeAuditLog({ actorId: result.user._id, action: 'login', entity: 'auth', entityId: String(result.user._id), ip: req.ip, userAgent: req.headers['user-agent'] || '' });

        return sendResponse(res, { statusCode: 200, message: 'Login successful', data: result });
    } catch (error) {
        next(error);
    }
};

export const refresh = async (req, res, next) => {
    try {
        const result = await refreshAccessToken(req.body.refreshToken);
        return sendResponse(res, { statusCode: 200, message: 'Token refreshed', data: result });
    } catch (error) {
        next(error);
    }
};

export const logout = async (req, res, next) => {
    try {
        await logoutByRefreshToken(req.user._id, req.body.refreshToken);
        return sendResponse(res, { statusCode: 200, message: 'Logout successful' });
    } catch (error) {
        next(error);
    }
};
