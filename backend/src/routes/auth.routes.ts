import { Router, type NextFunction, type Request, type Response } from "express";
import { authIpLimiter, emailLimiter } from "../middlewares/rate-limit.middleware";
import { HttpError } from "../lib/errors";
import { validate } from "../middlewares/validate.middleware";
import {
  accountTypeSchema, emailOnlySchema, loginSchema, refreshSessionSchema, registerSchema, resetPasswordSchema, verifyEmailSchema
} from "../schemas/auth.schema";
import * as auth from "../services/auth.service";

const router = Router();
const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

const SENT = "Si el correo es válido, recibirás un código en unos minutos.";

router.use(authIpLimiter);

const bearerToken = (req: Request): string => {
  const header = req.header("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Debes iniciar sesión.", "AUTH_REQUIRED");
  return match[1];
};

router.post("/register", validate(registerSchema), emailLimiter(5), wrap(async (req, res) => {
  await auth.registerUser(req.body);
  res.status(202).json({ success: true, message: SENT });
}));

router.post("/verify-email", validate(verifyEmailSchema), emailLimiter(10), wrap(async (req, res) => {
  await auth.verifyEmail(req.body.email, req.body.code);
  res.json({ success: true, message: "Correo verificado. Ya puedes iniciar sesión." });
}));

router.post("/resend-verification", validate(emailOnlySchema), emailLimiter(5), wrap(async (req, res) => {
  await auth.resendVerification(req.body.email);
  res.status(202).json({ success: true, message: SENT });
}));

router.post("/forgot-password", validate(emailOnlySchema), emailLimiter(5), wrap(async (req, res) => {
  await auth.forgotPassword(req.body.email);
  res.status(202).json({ success: true, message: SENT });
}));

router.post("/reset-password", validate(resetPasswordSchema), emailLimiter(10), wrap(async (req, res) => {
  await auth.resetPassword(req.body.email, req.body.code, req.body.newPassword);
  res.json({ success: true, message: "Contraseña actualizada. Inicia sesión con la nueva." });
}));

router.post("/login", validate(loginSchema), emailLimiter(10), wrap(async (req, res) => {
  const session = await auth.login(req.body.email, req.body.password);
  res.json({ success: true, data: session });
}));

router.post("/refresh", validate(refreshSessionSchema), wrap(async (req, res) => {
  const session = await auth.refreshSession(req.body.refreshToken);
  res.json({ success: true, data: session });
}));

router.post("/account-type", validate(accountTypeSchema), wrap(async (req, res) => {
  const user = await auth.setAccountType(bearerToken(req), req.body.accountType);
  res.json({ success: true, data: { user }, message: "Tipo de cuenta guardado." });
}));

router.get("/me", wrap(async (req, res) => {
  const user = await auth.getCurrentUser(bearerToken(req));
  res.json({ success: true, data: { user } });
}));

router.post("/logout", wrap(async (req, res) => {
  await auth.logout(bearerToken(req));
  res.json({ success: true, message: "Sesión cerrada correctamente." });
}));

export default router;
