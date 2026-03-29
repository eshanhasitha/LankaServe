import express from 'express';
import Joi from 'joi';
import Job from '../models/Job.model.js';
import Review from '../models/Review.model.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyCustomer } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.post('/', requireAuth, onlyCustomer, validate(Joi.object({
  jobId: Joi.string().required(),
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().allow('')
})), async (req, res, next) => {
  try {
    const job = await Job.findOne({ _id: req.body.jobId, customerId: req.user._id, status: 'completed' });
    if (!job) throw new Error('Only completed jobs can be reviewed');
    const review = await Review.create({ jobId: job._id, providerId: job.providerId, customerId: req.user._id, rating: req.body.rating, comment: req.body.comment || '' });
    res.status(201).json({ success: true, data: review });
  } catch (e) { next(e); }
});

router.get('/provider/:providerId', async (req, res, next) => {
  try { res.json({ success: true, data: await Review.find({ providerId: req.params.providerId, isDeleted: false }).sort({ createdAt: -1 }) }); }
  catch (e) { next(e); }
});

export default router;
