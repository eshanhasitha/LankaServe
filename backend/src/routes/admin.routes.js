import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { onlyAdmin } from "../middleware/role.middleware.js";
import User from '../models/User.model.js';
import ServiceProvider from '../models/ServiceProvider.model.js';
import Job from '../models/Job.model.js';

const router = express.Router();

router.get("/dashboard", requireAuth, onlyAdmin, (req, res) => {
  res.json({ message: "Admin route OK" });
});

router.get("/users", requireAuth, onlyAdmin, (req, res) => {
  res.status(501).json({ message: "List users not implemented yet" });
});

router.put("/provider/verify/:id", requireAuth, onlyAdmin, (req, res) => {
  res.status(501).json({ message: "Verify provider not implemented yet" });
});

router.delete("/job/:id", requireAuth, onlyAdmin, (req, res) => {
  res.status(501).json({ message: "Delete job not implemented yet" });
});

router.get("/analytics", requireAuth, onlyAdmin, (req, res) => {
  res.status(501).json({ message: "Analytics endpoint not implemented yet" });
});

router.get('/reports/summary', requireAuth, onlyAdmin, async (req, res, next) => {
  try {
    const [users, providers, jobs, completed] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      ServiceProvider.countDocuments({ isDeleted: false }),
      Job.countDocuments({ isDeleted: false }),
      Job.countDocuments({ status: 'completed', isDeleted: false }),
    ]);
    res.json({ success: true, data: { users, providers, jobs, completed } });
  } catch (e) {
    next(e);
  }
});

export default router;