import express from 'express';
import Joi from 'joi';
import { getMe, updateMe, addFavorite, removeFavorite } from '../controllers/user.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/me', getMe);
router.put(
    '/me',
    validate(
        Joi.object({
            name: Joi.string().min(2).max(100),
            language: Joi.string().valid('en', 'si', 'ta'),
            profileImage: Joi.string().allow(''),
            bio: Joi.string().allow(''),
            district: Joi.string().allow(''),
            city: Joi.string().allow(''),
            location: Joi.object({
                type: Joi.string().valid('Point').required(),
                coordinates: Joi.array().items(Joi.number()).length(2).required(),
            }),
        })
    ),
    updateMe
);
router.post('/favorites/:providerId', addFavorite);
router.delete('/favorites/:providerId', removeFavorite);

export default router;
