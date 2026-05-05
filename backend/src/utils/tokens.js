import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { sha256 } from './hash.js';

export const signAccessToken = (payload) => jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRES_IN });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);

export const signRefreshToken = (payload) => {
    const raw = crypto.randomBytes(48).toString('hex');
    const signed = jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
    return { token: `${raw}:${signed}`, tokenHash: sha256(raw) };
};

export const parseRefreshToken = (token) => {
    const [raw, signed] = String(token || '').split(':');
    if (!raw || !signed) throw new Error('Invalid refresh token format');
    const payload = jwt.verify(signed, env.JWT_REFRESH_SECRET);
    return { payload, tokenHash: sha256(raw) };
};
