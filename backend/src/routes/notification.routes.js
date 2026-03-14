import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = express.Router();
router.get("/:userId");
router.put("/read/:id");

export default router;  