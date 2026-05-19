import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
    createSupportRequest,
    getMySupportRequest,
    listMySupportRequests,
} from '../controllers/support-request.controller.js';

const router = express.Router();

const attachmentSchema = Joi.object({
    url: Joi.string().uri().required(),
    name: Joi.string().allow('').default(''),
    type: Joi.string().allow('').default(''),
});

const createSupportRequestSchema = Joi.object({
    category: Joi.string()
        .valid('Payment Issue', 'Technical Problem', 'Account Access', 'Verification Help', 'Job Issue', 'Other')
        .required(),
    subject: Joi.string().trim().min(2).max(120).optional(),
    message: Joi.string().trim().min(10).max(2000).required(),
    attachments: Joi.array().items(attachmentSchema).max(5).default([]),
});

router.use(requireAuth);
router.get('/my', listMySupportRequests);
router.get('/:id', getMySupportRequest);
router.post('/', validate(createSupportRequestSchema), createSupportRequest);

export default router;
