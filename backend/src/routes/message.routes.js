import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/", requireAuth, (req, res) => {
  res.status(501).json({ message: "Send message not implemented yet" });
});
router.get("/:user1/:user2", requireAuth, (req, res) => {
  res.status(501).json({ message: `Get messages between ${req.params.user1} and ${req.params.user2} not implemented yet` });
});

export default router;