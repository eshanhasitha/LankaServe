import express from 'express';
import Joi from 'joi';
import { register, login, refresh, logout } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { requireAuth } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post(
    '/register',
    authLimiter,
    validate(Joi.object({
        firebaseIdToken: Joi.string().required(),
        role: Joi.string().valid('customer', 'provider').optional(),
        providerProfile: Joi.object({
            categories: Joi.array().items(Joi.string()).min(1),
            bio: Joi.string().allow(''),
            yearsExperience: Joi.number().min(0),
            serviceArea: Joi.string().allow(''),
            location: Joi.object({
                type: Joi.string().valid('Point').default('Point'),
                coordinates: Joi.array().items(Joi.number()).length(2),
            }),
        }).optional(),
    })),
    register
);
router.post('/login', authLimiter, validate(Joi.object({ firebaseIdToken: Joi.string().required() })), login);
router.post('/refresh', authLimiter, validate(Joi.object({ refreshToken: Joi.string().required() })), refresh);
router.post('/logout', requireAuth, validate(Joi.object({ refreshToken: Joi.string().required() })), logout);

export default router;
