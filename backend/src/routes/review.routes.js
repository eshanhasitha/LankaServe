import express from 'express';
import Joi from 'joi';
import { createReview, listProviderReviews, deleteReview, getMyJobReview, getJobReview } from '../controllers/review.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { onlyCustomer } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.get('/provider/:providerId', listProviderReviews);
router.get('/job/:jobId', requireAuth, getJobReview);
router.get('/job/:jobId/mine', requireAuth, onlyCustomer, getMyJobReview);
router.post('/', requireAuth, onlyCustomer, validate(Joi.object({ jobId: Joi.string().required(), rating: Joi.number().min(1).max(5).required(), comment: Joi.string().allow('') })), createReview);
router.delete('/:id', requireAdminAuth, deleteReview);

export default router;
