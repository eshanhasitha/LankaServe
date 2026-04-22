import { Router } from 'express';
import { z } from 'zod';
import Job from '../models/Job';
import Notification from '../models/Notification';
import { requireAuth } from '../middleware/auth';
import { sendOk, sendFail } from '../utils/response';

const router = Router();
router.use(requireAuth);

const statusSchema = z.object({ status: z.enum(['accepted', 'arrived', 'ongoing', 'completed', 'cancelled']) });
const transitions = {
  pending: ['accepted', 'cancelled'],
  accepted: ['arrived', 'cancelled'],
  arrived: ['ongoing'],
  ongoing: ['completed'],
  completed: [],
  cancelled: [],
};

router.put('/:id/cancel', async (req, res) => {
  const user = req.user;
  const job = await Job.findById(req.params.id);
  if (!job) return sendFail(res, 404, 'Job not found', 'NOT_FOUND');
  if (String(job.get('customerId')) !== String(user._id)) return sendFail(res, 403, 'Forbidden', 'FORBIDDEN');
  if (!transitions[job.get('status')]?.includes('cancelled')) return sendFail(res, 400, 'Invalid status transition', 'INVALID_STATUS');
  job.set('status', 'cancelled');
  await job.save();
  if (job.get('providerId')) {
    await Notification.create({ userId: job.get('providerId'), type: 'job', title: 'Job Cancelled', body: `${job.get('title')} was cancelled.` });
  }
  return sendOk(res, 'Job cancelled', job);
});

router.put('/:id/status', async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return sendFail(res, 400, 'Invalid request', 'VALIDATION_ERROR');
  const { status } = parsed.data;

  const job = await Job.findById(req.params.id);
  if (!job) return sendFail(res, 404, 'Job not found', 'NOT_FOUND');
  if (!transitions[job.get('status')]?.includes(status)) return sendFail(res, 400, 'Invalid status transition', 'INVALID_STATUS');

  job.set('status', status);
  await job.save();
  await Notification.create({ userId: job.get('customerId'), type: 'job', title: 'Job Status Updated', body: `${job.get('title')} is now ${status}.` });
  return sendOk(res, 'Job status updated', job);
});

export default router;
