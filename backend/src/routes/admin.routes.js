import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { onlyAdmin } from "../middleware/role.middleware.js";

const router = express.Router();

router.get("/dashboard", requireAuth, onlyAdmin, (req, res) => {
  res.json({ message: "Admin route OK" });
});

export default router;
