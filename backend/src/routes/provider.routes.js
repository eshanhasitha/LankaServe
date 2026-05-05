import express from 'express';
import Joi from 'joi';
import {
    apply,
    getMeProvider,
    updateMeProvider,
    setAvailability,
    dashboard,
    analytics,
    badges,
    jobs,
    browseJobs,
    jobRequests,
    earnings,
    suggestions,
    publicProfile,
    searchProviders,
    jobQr,
} from '../controllers/provider.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyProvider } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.get('/', searchProviders);

router.post('/apply', requireAuth, validate(Joi.object({ categories: Joi.array().items(Joi.string()).required(), bio: Joi.string().allow(''), district: Joi.string().allow(''), city: Joi.string().allow(''), yearsExperience: Joi.number().min(0), verificationDocs: Joi.array().items(Joi.string()), location: Joi.object({ type: Joi.string().valid('Point').default('Point'), coordinates: Joi.array().items(Joi.number()).length(2).required() }) })), apply);

router.get('/me', requireAuth, onlyProvider, getMeProvider);
router.put('/me', requireAuth, onlyProvider, validate(Joi.object({ categories: Joi.array().items(Joi.string()), bio: Joi.string().allow(''), district: Joi.string().allow(''), city: Joi.string().allow(''), yearsExperience: Joi.number().min(0), location: Joi.object({ type: Joi.string().valid('Point').default('Point'), coordinates: Joi.array().items(Joi.number()).length(2) }) })), updateMeProvider);
router.put('/availability', requireAuth, onlyProvider, validate(Joi.object({ availability: Joi.string().valid('online', 'offline').required() })), setAvailability);
router.get('/dashboard', requireAuth, onlyProvider, dashboard);
router.get('/analytics', requireAuth, onlyProvider, analytics);
router.get('/badges', requireAuth, onlyProvider, badges);
router.get('/jobs', requireAuth, onlyProvider, jobs);
router.get('/browse-jobs', requireAuth, onlyProvider, browseJobs);
router.get('/job-requests', requireAuth, onlyProvider, jobRequests);
router.get('/earnings', requireAuth, onlyProvider, earnings);
router.get('/suggestions', requireAuth, onlyProvider, suggestions);
router.get('/:jobId/qr', requireAuth, onlyProvider, jobQr);

router.get('/:id', publicProfile);

export default router;
