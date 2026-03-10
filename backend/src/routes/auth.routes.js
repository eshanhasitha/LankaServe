import express from "express";
import admin from "../config/firebase.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  const { email, password, displayName } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || undefined
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName
      }
    });
  } catch (error) {
    const code = error?.code || "auth/internal-error";

    if (code === "auth/email-already-exists") {
      return res.status(409).json({ message: "Email already in use" });
    }

    if (code === "auth/invalid-password" || code === "auth/invalid-email") {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    return res.status(500).json({ message: "Failed to register user" });
  }
});

router.get("/verify", requireAuth, (req, res) => {
  res.json({ message: "Token valid", user: req.user });
});

export default router;
