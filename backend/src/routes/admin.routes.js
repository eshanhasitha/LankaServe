import { Router } from 'express';
import Job from '../models/Job';
import User from '../models/User';
import ServiceProvider from '../models/ServiceProvider';
import { requireAuth } from '../middleware/auth';
import { sendOk } from '../utils/response';

const router = Router();
router.use(requireAuth);

router.get('/reports/summary', async (_req, res) => {
  const [users, providers, jobs, completed] = await Promise.all([
    User.countDocuments({ isDeleted: false }),
    ServiceProvider.countDocuments({ isDeleted: false }),
    Job.countDocuments({ isDeleted: false }),
    Job.countDocuments({ status: 'completed', isDeleted: false }),
  ]);
  return sendOk(res, 'Reports summary', { users, providers, jobs, completed });
});

export default router;