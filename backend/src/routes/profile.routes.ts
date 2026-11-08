import { Router, type NextFunction, type Request, type Response } from "express";
import { HttpError } from "../lib/errors";
import { supabaseAdmin } from "../config/supabase";
import { getMyProfile, updateMyProfile } from "../services/profile.service";

const router = Router();
const wrap = (fn: (req: Request, res: Response) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

function bearerToken(req: Request): string {
  const match = req.header("authorization")?.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, "Debes iniciar sesión.", "AUTH_REQUIRED");
  return match[1];
}

async function authenticatedUser(req: Request) {
  const { data, error } = await supabaseAdmin.auth.getUser(bearerToken(req));
  if (error || !data.user) {
    throw new HttpError(401, "La sesión no es válida.", "INVALID_SESSION");
  }
  if (!data.user.email_confirmed_at) {
    throw new HttpError(403, "Debes verificar tu correo.", "EMAIL_NOT_VERIFIED");
  }
  return data.user;
}

router.get("/me", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  const profile = await getMyProfile(user.id, user.app_metadata?.nebula_account_type);
  res.json({ success: true, data: { profile } });
}));

router.patch("/me", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  const profile = await updateMyProfile(
    user.id,
    user.app_metadata?.nebula_account_type,
    req.body
  );
  res.json({ success: true, data: { profile }, message: "Perfil actualizado." });
}));

export default router;
