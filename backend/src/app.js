import express from "express";
import cors from "cors";
import routes from "./routes/index.routes.js";

const app = express();
app.use(express.json());

const origins = (process.env.CORS_ORIGINS || "").split(",").map((x) => x.trim()).filter(Boolean);
app.use(cors({ origin: origins.length ? origins : true }));

app.get("/", (req, res) => res.json({ message: "Backend running" }));
app.get(`${process.env.API_PREFIX}/health`, (req, res) => res.json({ status: "ok" }));

app.use(process.env.API_PREFIX, routes);

export default app;
