import express from 'express';
import { create, list, accept, reject } from '../controllers/job.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyCustomer, onlyProvider } from '../middleware/role.middleware.js';

const router = express.Router();
router.use(requireAuth);
router.post('/', onlyCustomer, create);
router.get('/', list);
router.put('/:id/accept', onlyProvider, accept);
router.put('/:id/reject', onlyProvider, reject);
export default router;
