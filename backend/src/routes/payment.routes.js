import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/", requireAuth, (req, res) => {
  res.status(501).json({ message: "Create payment not implemented yet" });
});
router.get("/job/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Get payment by job ${req.params.id} not implemented yet` });
});
router.get("/provider/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Get payments for provider ${req.params.id} not implemented yet` });
});

export default router;