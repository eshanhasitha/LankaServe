import { Router } from 'express';
import Notification from '../models/Notification';
import { requireAuth } from '../middleware/auth';
import { sendOk, sendFail } from '../utils/response';

const router = Router();
router.use(requireAuth);

router.get('/my', async (req, res) => {
  const userId = req.user._id;
  const items = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(100);
  return sendOk(res, 'Notifications loaded', items);
});

router.put('/read/:id', async (req, res) => {
  const userId = req.user._id;
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId }, { isRead: true }, { new: true });
  if (!item) return sendFail(res, 404, 'Notification not found', 'NOT_FOUND');
  return sendOk(res, 'Notification updated', item);
});

export default router;