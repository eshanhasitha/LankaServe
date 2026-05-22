import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { send, thread, readThread, conversations } from '../controllers/message.controller.js';

const router = express.Router();

router.use(requireAuth);
router.get('/conversations', conversations);
router.post('/send', validate(Joi.object({ receiverId: Joi.string().required(), content: Joi.string().min(1).required(), jobId: Joi.string().allow('', null) })), send);
router.get('/thread/:userId', thread);
router.put('/read/:threadId', readThread);

export default router;
