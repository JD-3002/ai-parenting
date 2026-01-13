import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import questionRoutes from "./routes/question.routes.js";
import authRoutes from "./routes/auth.routes.js";
import childRoutes from "./routes/child.routes.js";
import planRoutes from "./routes/plan.routes.js";

const app = express();
const corsOptions = {
  origin: process.env.CLIENT_ORIGIN || "*",
  credentials: true
};
app.use(cors(corsOptions));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false
});
app.use("/api", limiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/children", childRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/plans", planRoutes);

// Basic error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ error: message });
});
export default app;
