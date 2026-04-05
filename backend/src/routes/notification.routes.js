import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getMyNotifications, markRead } from '../services/notification.service.js';

const router = express.Router();
router.use(requireAuth);

router.get('/my', async (req, res, next) => {
  try { res.json({ success: true, data: await getMyNotifications(req.user._id) }); }
  catch (e) { next(e); }
});

router.put('/read/:id', async (req, res, next) => {
  try { res.json({ success: true, data: await markRead(req.user._id, req.params.id) }); }
  catch (e) { next(e); }
});

export default router;
