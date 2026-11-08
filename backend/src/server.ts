import app from "./app";
import { env } from "./config/env";

const port = Number(process.env.PORT) || env.PORT;
const server = app.listen(port, "0.0.0.0", () =>
  console.log(`[NÉBULA] API en 0.0.0.0:${port} (${env.NODE_ENV})`)
);

const shutdown = (signal: string) => {
  console.log(`[NÉBULA] ${signal}: cerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.once("SIGTERM", () => shutdown("SIGTERM"));
process.once("SIGINT", () => shutdown("SIGINT"));
