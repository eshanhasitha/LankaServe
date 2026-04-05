import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = express.Router();

router.post("/", requireAuth, (req, res) => {
  res.status(501).json({ message: "Create provider not implemented yet" });
});

router.get("/", (req, res) => {
  res.status(501).json({ message: "List providers not implemented yet" });
});

router.get("/category/:category", (req, res) => {
  res.status(501).json({ message: `List providers in category ${req.params.category} not implemented yet` });
});

router.get("/:id", (req, res) => {
  res.status(501).json({ message: `Get provider ${req.params.id} not implemented yet` });
});

router.put("/:id", requireAuth, (req, res) => {
  res.status(501).json({ message: `Update provider ${req.params.id} not implemented yet` });
});

export default router;