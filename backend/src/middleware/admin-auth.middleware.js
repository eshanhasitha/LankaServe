import Admin from '../models/Admin.model.js';
import { verifyAccessToken } from '../utils/tokens.js';

export const requireAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new Error('Unauthorized');
    }

    const payload = verifyAccessToken(token);

    if (payload.kind !== 'admin' || payload.role !== 'admin') {
      throw new Error('Unauthorized');
    }

    const admin = await Admin.findOne({
      _id: payload.sub,
      isDeleted: false,
      isActive: true,
    }).select('+refreshTokens');

    if (!admin) {
      throw new Error('Unauthorized');
    }

    req.admin = admin;
    next();
  } catch (error) {
    next(error);
  }
};

export const onlySuperAdmin = (req, res, next) => {
  try {
    if (req.admin?.role !== 'super_admin') {
      throw new Error('Forbidden');
    }
    next();
  } catch (error) {
    next(error);
  }
};
