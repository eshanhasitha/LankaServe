import express from 'express';
import Joi from 'joi';
import {
    create,
    update,
    list,
    getById,
    accept,
    reject,
    cancel,
    arrivalScan,
    start,
    completeProvider,
    completeCustomer,
    finalize,
} from '../controllers/job.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyCustomer, onlyProvider } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', onlyCustomer, validate(Joi.object({ title: Joi.string().required(), description: Joi.string().required(), category: Joi.string().required(), location: Joi.object({ type: Joi.string().valid('Point').default('Point'), coordinates: Joi.array().items(Joi.number()).length(2).required() }).required(), images: Joi.array().items(Joi.string()), price: Joi.number().min(0).required(), preferredProviderId: Joi.string().length(24).optional().allow(null, '') })), create);
router.put('/:id', onlyCustomer, validate(Joi.object({ title: Joi.string().required(), description: Joi.string().required(), category: Joi.string().required(), location: Joi.object({ type: Joi.string().valid('Point').default('Point'), coordinates: Joi.array().items(Joi.number()).length(2).required() }).required(), images: Joi.array().items(Joi.string()), price: Joi.number().min(0).required(), preferredProviderId: Joi.string().length(24).optional().allow(null, '') })), update);
router.get('/', list);
router.get('/:id', getById);
router.put('/:id/accept', onlyProvider, accept);
router.put('/:id/reject', onlyProvider, reject);
router.put('/:id/cancel', onlyCustomer, cancel);
router.put('/:id/arrival/scan', onlyCustomer, validate(Joi.object({ token: Joi.string().required() })), arrivalScan);
router.put('/:id/start', onlyProvider, start);
router.put('/:id/complete/provider', onlyProvider, completeProvider);
router.put('/:id/complete/customer', onlyCustomer, completeCustomer);
router.put('/:id/complete/finalize', finalize);

export default router;
