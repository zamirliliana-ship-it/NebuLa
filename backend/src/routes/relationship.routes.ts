import { Router, type NextFunction, type Request, type Response } from "express";
import { HttpError } from "../lib/errors";
import { supabaseAdmin } from "../config/supabase";
import { createInvite, listRelationships, redeemInvite, respondToRelationship } from "../services/relationship.service";

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
  if (error || !data.user) throw new HttpError(401, "La sesión no es válida.", "INVALID_SESSION");
  if (!data.user.email_confirmed_at) throw new HttpError(403, "Debes verificar tu correo.", "EMAIL_NOT_VERIFIED");
  return data.user;
}

function accountType(user: Awaited<ReturnType<typeof authenticatedUser>>) {
  const role = user.app_metadata?.nebula_account_type;
  if (role !== "autistic_person" && role !== "parent_guardian" && role !== "teacher") {
    throw new HttpError(403, "Tu cuenta no tiene un rol válido.", "ACCOUNT_ROLE_INVALID");
  }
  return role;
}

router.post("/invites", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  if (accountType(user) !== "autistic_person") throw new HttpError(403, "Solo la persona titular puede generar códigos de vinculación.", "INVITE_FORBIDDEN");
  const invite = await createInvite(user.id);
  res.status(201).json({ success: true, data: invite });
}));

router.post("/redeem", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  if (accountType(user) !== "parent_guardian") throw new HttpError(403, "Solo una cuenta familiar puede solicitar esta vinculación.", "RELATIONSHIP_REQUEST_FORBIDDEN");
  const relationship = await redeemInvite(user.id, req.body?.code, req.body?.relationshipType, req.body?.authorityBasis);
  res.status(201).json({ success: true, data: { relationship }, message: "Solicitud enviada. El acceso seguirá bloqueado hasta su autorización." });
}));

router.get("/", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  accountType(user);
  const relationships = await listRelationships(user.id);
  res.json({ success: true, data: { relationships } });
}));

router.post("/:id/respond", wrap(async (req, res) => {
  const user = await authenticatedUser(req);
  accountType(user);
  const relationship = await respondToRelationship(user.id, req.params.id, req.body?.action);
  res.json({ success: true, data: { relationship } });
}));

export default router;
