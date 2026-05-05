import express from 'express';
import Joi from 'joi';
import {
  adminLogin,
  adminRefresh,
  adminLogout,
} from '../controllers/admin-auth.controller.js';
import { requireAdminAuth } from '../middleware/admin-auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';

const router = express.Router();

router.post(
  '/login',
  validate(
    Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(6).required(),
    })
  ),
  adminLogin
);

router.post(
  '/refresh',
  validate(
    Joi.object({
      refreshToken: Joi.string().required(),
    })
  ),
  adminRefresh
);

router.post(
  '/logout',
  requireAdminAuth,
  validate(
    Joi.object({
      refreshToken: Joi.string().required(),
    })
  ),
  adminLogout
);

export default router;
