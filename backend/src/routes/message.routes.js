import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();
router.post("/");
router.get("/:user1/:user2");

export default router;