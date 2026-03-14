import express from "express";
import authRoutes from "./auth.routes.js";
import userRoutes from "./user.routes.js";
import adminRoutes from "./admin.routes.js";
import providerRoutes from "./provider.routes.js";
import jobRoutes from "./job.routes.js";
import reviewRoutes from "./review.routes.js";
import messageRoutes from "./message.routes.js";
import paymentRoutes from "./payment.routes.js";
import notificationRoutes from "./notification.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/providers", providerRoutes);
router.use("/jobs", jobRoutes);
router.use("/reviews", reviewRoutes);
router.use("/messages", messageRoutes);
router.use("/payments", paymentRoutes);
router.use("/notifications", notificationRoutes);
router.use("/admin", adminRoutes);

export default router;
