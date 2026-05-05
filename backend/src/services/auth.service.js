import User from '../models/User.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import { firebaseAuth } from '../config/firebase.js';
import { signAccessToken, signRefreshToken, parseRefreshToken } from '../utils/tokens.js';
import mongoose from 'mongoose';

const refreshExpiryDate = () => {
    const now = Date.now();
    return new Date(now + 30 * 24 * 60 * 60 * 1000);
};

const mapAuthProvider = (decoded) => {
    const providerId = decoded?.firebase?.sign_in_provider;
    if (providerId === 'google.com') return 'google';
    return 'password';
};

const decodeFirebaseIdentity = async (firebaseIdToken) => {
    let decoded;
    if (String(firebaseIdToken).startsWith('dev:')) {
        const parts = String(firebaseIdToken).split(':');
        if (parts.length < 3) {
            throw new Error('Invalid dev token format: dev:email:name[:role]');
        }
        decoded = {
            uid: `dev_${parts[1]}`,
            email: parts[1],
            name: parts[2],
            role: parts[3] || 'customer',
        };
    } else if (firebaseAuth) {
        decoded = await firebaseAuth.verifyIdToken(firebaseIdToken);
    } else {
        throw new Error('Firebase is not configured');
    }
    return decoded;
};

const validateEmail = (email) => {
    if (!email) throw new Error('Email is required');

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
    }

    if (!email.endsWith('@gmail.com')) {
        throw new Error('Only Gmail addresses are accepted');
    }
};

const createSessionTokens = async (user) => {
    const payload = { sub: String(user._id), role: user.role };
    const accessToken = signAccessToken(payload);
    const refresh = signRefreshToken(payload);

    user.refreshTokens.push({ tokenHash: refresh.tokenHash, expiresAt: refreshExpiryDate() });
    await user.save();

    return { accessToken, refreshToken: refresh.token };
};

const ensureProviderProfile = async (userId, profile = {}) => {
    const existing = await ServiceProvider.findOne({ userId, isDeleted: false });
    if (existing) return existing;

    return ServiceProvider.create({
        userId,
        categories: profile.categories?.length ? profile.categories : ['Other'],
        bio: profile.bio || profile.serviceArea || '',
        yearsExperience: profile.yearsExperience || 0,
        location: profile.location || { type: 'Point', coordinates: [79.8612, 6.9271] },
    });
};

export const registerWithFirebaseToken = async (firebaseIdToken, requestedRole = 'customer', providerProfile = null) => {
    const decoded = await decodeFirebaseIdentity(firebaseIdToken);
    validateEmail(decoded.email);
    const authProvider = mapAuthProvider(decoded);

    const existingByUid = await User.findOne({ firebaseUid: decoded.uid });
    const existingByEmail = await User.findOne({ email: decoded.email });
    if (existingByUid || existingByEmail) {
        throw new Error('User already exists. Please login.');
    }

    const role = ['customer', 'provider'].includes(requestedRole) ? requestedRole : 'customer';

    const user = await User.create({
        firebaseUid: decoded.uid,
        email: decoded.email || `${decoded.uid}@firebase.local`,
        name: decoded.name || 'User',
        authProvider,
        role,
    });

    if (role === 'provider') {
        await ensureProviderProfile(user._id, providerProfile || {});
    }

    const tokens = await createSessionTokens(user);
    return { user, ...tokens };
};

export const loginWithFirebaseToken = async (firebaseIdToken) => {
    const decoded = await decodeFirebaseIdentity(firebaseIdToken);
    validateEmail(decoded.email);
    const authProvider = mapAuthProvider(decoded);

    let user = await User.findOne({ firebaseUid: decoded.uid });
    if (!user) {
        user = await User.findOne({ email: decoded.email });
    }

    if (!user) {
        user = await User.create({
            firebaseUid: decoded.uid,
            email: decoded.email || `${decoded.uid}@firebase.local`,
            name: decoded.name || 'User',
            authProvider,
            role: ['customer', 'provider', 'admin'].includes(decoded.role) ? decoded.role : 'customer',
        });
    } else {
        const nextEmail = decoded.email || `${decoded.uid}@firebase.local`;
        const nextName = decoded.name || user.name || 'User';
        let shouldSave = false;

        if (user.firebaseUid !== decoded.uid) {
            user.firebaseUid = decoded.uid;
            shouldSave = true;
        }
        if (user.email !== nextEmail) {
            user.email = nextEmail;
            shouldSave = true;
        }
        if (user.name !== nextName) {
            user.name = nextName;
            shouldSave = true;
        }
        if (user.authProvider !== authProvider) {
            user.authProvider = authProvider;
            shouldSave = true;
        }

        if (shouldSave) {
            await user.save();
        }
    }

    if (user.role === 'provider') {
        await ensureProviderProfile(user._id, {});
    }

    const tokens = await createSessionTokens(user);

    return { user, ...tokens };
};

export const refreshAccessToken = async (refreshToken) => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('Database unavailable. Please try again in a moment.');
    }

    const { payload, tokenHash } = parseRefreshToken(refreshToken);
    const user = await User.findById(payload.sub);
    if (!user) throw new Error('User not found');

    const tokenDoc = user.refreshTokens.find((t) => t.tokenHash === tokenHash && !t.revokedAt && t.expiresAt > new Date());
    if (!tokenDoc) throw new Error('Refresh token invalid');

    tokenDoc.revokedAt = new Date();

    const newPayload = { sub: String(user._id), role: user.role };
    const accessToken = signAccessToken(newPayload);
    const refresh = signRefreshToken(newPayload);

    user.refreshTokens.push({ tokenHash: refresh.tokenHash, expiresAt: refreshExpiryDate() });
    await user.save();

    return { accessToken, refreshToken: refresh.token };
};

export const logoutByRefreshToken = async (userId, refreshToken) => {
    const { tokenHash } = parseRefreshToken(refreshToken);
    const user = await User.findById(userId);
    if (!user) return;

    user.refreshTokens = user.refreshTokens.map((tokenDoc) => {
        if (tokenDoc.tokenHash === tokenHash) {
            tokenDoc.revokedAt = new Date();
        }
        return tokenDoc;
    });
    await user.save();
};
