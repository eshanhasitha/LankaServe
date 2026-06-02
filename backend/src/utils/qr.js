import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { sha256 } from './hash.js';

export const generateSecureQR = ({ jobId, providerId }) => {
    const nonce = crypto.randomBytes(24).toString('hex');
    const token = jwt.sign({ jobId, providerId, nonce, type: 'job_qr' }, env.JWT_ACCESS_SECRET, {
        expiresIn: `${env.QR_TOKEN_EXPIRY_MINUTES}m`,
    });
    return {
        token,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + env.QR_TOKEN_EXPIRY_MINUTES * 60 * 1000),
    };
};

export const verifySecureQR = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
