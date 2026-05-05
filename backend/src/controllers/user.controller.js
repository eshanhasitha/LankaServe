import User from '../models/User.model.js';
import { sendResponse } from '../utils/response.js';

export const getMe = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select('-refreshTokens');
        return sendResponse(res, { message: 'My profile', data: user });
    } catch (error) {
        next(error);
    }
};

export const updateMe = async (req, res, next) => {
    try {
        const allowed = ['name', 'language', 'profileImage', 'bio', 'district', 'city', 'location'];
        const update = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }
        const user = await User.findByIdAndUpdate(req.user._id, update, { returnDocument: 'after' });
        return sendResponse(res, { message: 'Profile updated', data: user });
    } catch (error) {
        next(error);
    }
};

export const addFavorite = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const providerId = req.params.providerId;
        if (!user.favorites.map(String).includes(providerId)) user.favorites.push(providerId);
        await user.save();
        return sendResponse(res, { message: 'Favorite added', data: user.favorites });
    } catch (error) {
        next(error);
    }
};

export const removeFavorite = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);
        const providerId = req.params.providerId;
        user.favorites = user.favorites.filter((id) => String(id) !== providerId);
        await user.save();
        return sendResponse(res, { message: 'Favorite removed', data: user.favorites });
    } catch (error) {
        next(error);
    }
};
