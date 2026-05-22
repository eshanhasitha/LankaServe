import mongoose from 'mongoose';
import Admin from '../models/Admin.model.js';
import { comparePassword } from '../utils/password.js';
import { signAccessToken, signRefreshToken, parseRefreshToken } from '../utils/tokens.js';

const refreshExpiryDate = () => {
  const now = Date.now();
  return new Date(now + 30 * 24 * 60 * 60 * 1000);
};

const serializeAdmin = (admin) => ({
  _id: admin._id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  isActive: admin.isActive,
  createdAt: admin.createdAt,
  updatedAt: admin.updatedAt,
});

const createAdminSessionTokens = async (admin) => {
  const payload = {
    sub: String(admin._id),
    role: 'admin',
    adminRole: admin.role,
    kind: 'admin',
  };

  const accessToken = signAccessToken(payload);
  const refresh = signRefreshToken(payload);

  admin.refreshTokens.push({
    tokenHash: refresh.tokenHash,
    expiresAt: refreshExpiryDate(),
  });

  await admin.save();

  return {
    accessToken,
    refreshToken: refresh.token,
  };
};

export const loginAdmin = async (email, password) => {
  const admin = await Admin.findOne({
    email: String(email).toLowerCase().trim(),
    isDeleted: false,
  }).select('+passwordHash +refreshTokens');

  if (!admin || !admin.isActive) {
    throw new Error('Invalid admin credentials');
  }

  const ok = await comparePassword(password, admin.passwordHash);
  if (!ok) {
    throw new Error('Invalid admin credentials');
  }

  const tokens = await createAdminSessionTokens(admin);

  return {
    admin: serializeAdmin(admin),
    ...tokens,
  };
};

export const refreshAdminToken = async (refreshToken) => {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database unavailable. Please try again in a moment.');
  }

  const { payload, tokenHash } = parseRefreshToken(refreshToken);

  if (payload.kind !== 'admin') {
    throw new Error('Invalid admin refresh token');
  }

  const admin = await Admin.findById(payload.sub).select('+refreshTokens');
  if (!admin || !admin.isActive) {
    throw new Error('Admin not found');
  }

  const tokenDoc = admin.refreshTokens.find(
    (t) => t.tokenHash === tokenHash && !t.revokedAt && t.expiresAt > new Date()
  );

  if (!tokenDoc) {
    throw new Error('Refresh token invalid');
  }

  tokenDoc.revokedAt = new Date();

  const newPayload = {
    sub: String(admin._id),
    role: 'admin',
    adminRole: admin.role,
    kind: 'admin',
  };

  const accessToken = signAccessToken(newPayload);
  const refresh = signRefreshToken(newPayload);

  admin.refreshTokens.push({
    tokenHash: refresh.tokenHash,
    expiresAt: refreshExpiryDate(),
  });

  await admin.save();

  return {
    accessToken,
    refreshToken: refresh.token,
  };
};

export const logoutAdminByRefreshToken = async (adminId, refreshToken) => {
  const { tokenHash } = parseRefreshToken(refreshToken);
  const admin = await Admin.findById(adminId).select('+refreshTokens');
  if (!admin) return;

  admin.refreshTokens = admin.refreshTokens.map((tokenDoc) => {
    if (tokenDoc.tokenHash === tokenHash) {
      tokenDoc.revokedAt = new Date();
    }
    return tokenDoc;
  });

  await admin.save();
};
