import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
const router = express.Router();
router.post("/");
router.get("/provider/:id");
router.delete("/:id");

export default router;