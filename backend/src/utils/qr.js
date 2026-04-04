import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_ACCESS_SECRET || 'dev_access_secret';

export const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');

export function generateSecureQR(payload) {
  const token = jwt.sign(payload, SECRET, { expiresIn: '15m' });
  return { token, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 15 * 60 * 1000) };
}

export function verifySecureQR(token) {
  return jwt.verify(token, SECRET);
}
