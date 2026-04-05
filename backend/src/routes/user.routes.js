import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/me", requireAuth, (req, res) => {
  res.json({ message: "Protected route OK", user: req.user });
});

router.get("/", requireAuth, (req, res) => {
  res.status(501).json({ message: "List users not implemented yet" });
});

router.get("/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Get user ${req.params.id} not implemented yet` });
});

router.put("/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Update user ${req.params.id} not implemented yet` });
});

router.delete("/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Delete user ${req.params.id} not implemented yet` });
});

export default router;
