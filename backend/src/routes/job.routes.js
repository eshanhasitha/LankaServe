import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";


const router = express.Router();
router.post("/");
router.get("/");
router.get("/:id");
router.put("/:id/accept");
router.put("/:id/complete");

export default router;