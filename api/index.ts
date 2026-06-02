import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "../src/routes";
import authRouter from "../src/authRoutes";
import { authMiddleware } from "../src/auth";

dotenv.config();

const app = express();

// CORS — allow frontend origin + localhost for dev
const rawOrigin = process.env.FRONTEND_URL ?? "";
const allowedOrigins = [
  ...rawOrigin.split(",").map(s => s.trim()).filter(Boolean),
  "http://localhost:5173",
  "http://localhost:4173",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false); // silently reject instead of throwing
    }
  },
  credentials: true,
}));

app.use(express.json());

// Health check — useful to verify the function is alive on Vercel
app.get("/health", (_req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString() });
});

// Auth routes (public)
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api", authMiddleware, router);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "InventoryFin API" });
});

// Global error handler — prevents unhandled errors from crashing the function
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
