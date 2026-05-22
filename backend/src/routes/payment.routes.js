import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyProvider, onlyCustomer } from '../middleware/role.middleware.js';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { init, markProviderPaid, confirmByCustomer, verifyByAdmin, myPayments } from '../controllers/payment.controller.js';

const router = express.Router();

router.put('/:jobId/admin-verify', requireAdminAuth, verifyByAdmin);

router.use(requireAuth);
router.post('/:jobId/init', init);
router.put('/:jobId/provider-paid', onlyProvider, markProviderPaid);
router.put('/:jobId/customer-confirm', onlyCustomer, confirmByCustomer);
router.get('/my', onlyProvider, myPayments);

export default router;
