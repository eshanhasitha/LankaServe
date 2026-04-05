import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = express.Router();
router.get("/:userId", requireAuth, (req, res) => {
  res.status(501).json({ message: `Get notifications for user ${req.params.userId} not implemented yet` });
});
router.put("/read/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Mark notification ${req.params.id} as read not implemented yet` });
});

export default router;  