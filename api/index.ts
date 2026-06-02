import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import router from "../src/routes";
import authRouter from "../src/authRoutes";
import { authMiddleware } from "../src/auth";

dotenv.config();

const app = express();

// Allow requests from the frontend origin
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow same-origin (no origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

// Public auth routes
app.use("/api/auth", authRouter);

// Protected routes
app.use("/api", authMiddleware, router);

app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Inventory Financial System API" });
});

export default app;
