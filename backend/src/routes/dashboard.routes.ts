import { Router, type NextFunction, type Request, type Response } from "express";
import { HttpError } from "../lib/errors";
import { supabaseAdmin } from "../config/supabase";
import { createEmotion, createObservation, getDashboard } from "../services/dashboard.service";
const router=Router();
const wrap=(fn:(req:Request,res:Response)=>Promise<void>)=>(req:Request,res:Response,next:NextFunction)=>fn(req,res).catch(next);
async function user(req:Request){const token=req.header("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)throw new HttpError(401,"Debes iniciar sesión.","AUTH_REQUIRED");const {data,error}=await supabaseAdmin.auth.getUser(token);if(error||!data.user?.email_confirmed_at)throw new HttpError(401,"La sesión no es válida o el correo no está verificado.","INVALID_SESSION");return data.user;}
router.get("/",wrap(async(req,res)=>{const u=await user(req);res.json({success:true,data:await getDashboard(u.id,u.app_metadata?.nebula_account_type)});}));
router.post("/emotions",wrap(async(req,res)=>{const u=await user(req);const d=await getDashboard(u.id,u.app_metadata?.nebula_account_type);if(d.role!=="autistic_person")throw new HttpError(403,"Solo la persona titular puede registrar sus emociones.","EMOTION_ROLE_FORBIDDEN");res.status(201).json({success:true,data:{entry:await createEmotion(u.id,req.body)}});}));
router.post("/observations",wrap(async(req,res)=>{const u=await user(req);const d=await getDashboard(u.id,u.app_metadata?.nebula_account_type);res.status(201).json({success:true,data:{observation:await createObservation(u.id,d.role,req.body)}});}));
export default router;
