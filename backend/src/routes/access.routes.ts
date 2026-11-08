import { Router } from "express";
import { requireAuth, requireRoles, type AuthenticatedRequest } from "../middlewares/auth.middleware";
import { updateConsent, revokeConsent, listConsents, listTeacherAccess, requestTeacherAccess } from "../services/access.service";

const router = Router();
router.use(requireAuth);

router.get("/consents", async (req, res, next) => {
  try { res.json({ success: true, data: { consents: await listConsents((req as AuthenticatedRequest).user!.id) } }); } catch (e) { next(e); }
});
router.patch("/consents/:relationshipId", requireRoles("autistic_person"), async (req, res, next) => {
  try { const user = (req as AuthenticatedRequest).user!; const consent = await updateConsent(user.id, req.params.relationshipId, req.body?.scopes, req.body?.expiresAt); res.json({ success: true, data: { consent }, message: "Permisos actualizados." }); } catch (e) { next(e); }
});
router.post("/consents/:relationshipId/revoke", requireRoles("autistic_person"), async (req, res, next) => {
  try { const consent = await revokeConsent((req as AuthenticatedRequest).user!.id, req.params.relationshipId); res.json({ success: true, data: { consent }, message: "Permisos revocados." }); } catch (e) { next(e); }
});
router.get("/teacher-access", async (req, res, next) => {
  try { res.json({ success: true, data: { access: await listTeacherAccess((req as AuthenticatedRequest).user!.id) } }); } catch (e) { next(e); }
});
router.post("/teacher-access", requireRoles("teacher"), async (req, res, next) => {
  try { const user = (req as AuthenticatedRequest).user!; const access = await requestTeacherAccess(user.id, req.body?.studentId, req.body?.institutionId, req.body?.scopes); res.status(201).json({ success: true, data: { access }, message: "Solicitud docente enviada." }); } catch (e) { next(e); }
});
export default router;
