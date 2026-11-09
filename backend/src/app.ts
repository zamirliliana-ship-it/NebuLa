import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "./config/env";
import {
  errorHandler,
  notFound,
} from "./middlewares/error.middleware";
import { globalLimiter } from "./middlewares/rate-limit.middleware";

import authRoutes from "./routes/auth.routes";
import profileRoutes from "./routes/profile.routes";
import relationshipRoutes from "./routes/relationship.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import accessRoutes from "./routes/access.routes";

const app = express();

// Configuración para cuando la aplicación esté publicada.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");

// Cabeceras de seguridad.
app.use(
  helmet({
    strictTransportSecurity:
      env.NODE_ENV === "production"
        ? {
            maxAge: 31_536_000,
            includeSubDomains: true,
          }
        : false,
  }),
);

// Direcciones permitidas del frontend.
const allowed = new Set(
  env.FRONTEND_URL.split(",").map((origin) => origin.trim()),
);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowed.has(origin));
    },
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
  }),
);

// Protección contra demasiadas solicitudes.
app.use(globalLimiter);

// Permite guardar los formularios completos con un tamaño limitado.
app.use(
  express.json({
    limit: "128kb",
    strict: true,
  }),
);

// Evita que las respuestas de la API se guarden en caché.
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Permite comprobar qué backend está funcionando.
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "nebula-api",
    apiVersion: "2",
  });
});

// Conexiones con las funciones de la aplicación.
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/relationships", relationshipRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/access", accessRoutes);

// Estas dos líneas deben quedar después de las rutas.
app.use(notFound);
app.use(errorHandler);

export default app;