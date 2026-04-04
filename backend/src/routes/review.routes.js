import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = express.Router();
router.post("/", requireAuth, (req, res) => {
  res.status(501).json({ message: "Create review not implemented yet" });
});
router.get("/provider/:id", (req, res) => {
  res.status(501).json({ message: `List reviews for provider ${req.params.id} not implemented yet` });
});
router.delete("/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Delete review ${req.params.id} not implemented yet` });
});

export default router;