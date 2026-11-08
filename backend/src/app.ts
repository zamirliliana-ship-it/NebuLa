import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { globalLimiter } from "./middlewares/rate-limit.middleware";
import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import relationshipRoutes from "./routes/relationship.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import accessRoutes from "./routes/access.routes";

const app = express();

// Render termina TLS: se confía solo en el primer proxy.
if (env.NODE_ENV === "production") app.set("trust proxy", 1);

app.disable("x-powered-by");
app.use(helmet({
  strictTransportSecurity: env.NODE_ENV === "production"
    ? { maxAge: 31_536_000, includeSubDomains: true }
    : false
}));

const allowed = new Set(env.FRONTEND_URL.split(",").map((o) => o.trim()));
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowed.has(origin)),
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

app.use(express.json({ limit: "8kb", strict: true }));
app.use(globalLimiter);
app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });

app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/access", accessRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
