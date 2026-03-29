import express from 'express';
import Joi from 'joi';
import { requireAuth } from '../middleware/auth.middleware.js';
import { onlyCustomer, onlyProvider } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { acceptJob, scanArrivalQR, startJob, confirmCompletion, finalizeCompletion } from '../services/job.service.js';

const router = express.Router();
router.use(requireAuth);

router.put('/:id/accept', onlyProvider, async (req, res, next) => { try { res.json({ success: true, data: await acceptJob(req.params.id, req.user._id) }); } catch (e) { next(e); } });
router.put('/:id/arrival/scan', onlyCustomer, validate(Joi.object({ token: Joi.string().required() })), async (req, res, next) => { try { res.json({ success: true, data: await scanArrivalQR(req.params.id, req.body.token) }); } catch (e) { next(e); } });
router.put('/:id/start', onlyProvider, async (req, res, next) => { try { res.json({ success: true, data: await startJob(req.params.id, req.user._id) }); } catch (e) { next(e); } });
router.put('/:id/complete/provider', onlyProvider, async (req, res, next) => { try { res.json({ success: true, data: await confirmCompletion(req.params.id, req.user._id, 'provider') }); } catch (e) { next(e); } });
router.put('/:id/complete/customer', onlyCustomer, async (req, res, next) => { try { res.json({ success: true, data: await confirmCompletion(req.params.id, req.user._id, 'customer') }); } catch (e) { next(e); } });
router.put('/:id/complete/finalize', async (req, res, next) => { try { res.json({ success: true, data: await finalizeCompletion(req.params.id) }); } catch (e) { next(e); } });

export default router;
