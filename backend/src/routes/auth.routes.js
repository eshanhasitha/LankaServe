import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/verify", requireAuth, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

export default router;
