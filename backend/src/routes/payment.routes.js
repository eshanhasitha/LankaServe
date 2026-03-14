import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/");
router.get("/job/:id");
router.get("/provider/:id");

export default router;