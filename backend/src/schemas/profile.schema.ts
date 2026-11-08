import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const textList = z.array(z.string().trim().min(1).max(80)).max(30).optional();
const contactMethod = z.enum(["email", "phone", "whatsapp"]).nullable().optional();

export const autisticProfileSchema = z.object({
  display_name: optionalText(100),
  pronouns: optionalText(40),
  communication_preferences: optionalText(2000),
  sensory_preferences: optionalText(2000),
  interests: textList,
  strengths: textList,
  routines: optionalText(2000),
  support_preferences: optionalText(2000),
  things_to_avoid: optionalText(2000),
  preferred_environment: optionalText(1000)
}).strict().refine((value) => Object.keys(value).length > 0, "Incluye al menos un campo para actualizar.");

export const guardianProfileSchema = z.object({
  phone: optionalText(40),
  preferred_contact_method: contactMethod,
  relationship_to_person: z.enum(["mother", "father", "legal_guardian", "caregiver", "other"]).nullable().optional(),
  preferred_language: optionalText(60),
  availability: optionalText(500),
  notes: optionalText(1000)
}).strict().refine((value) => Object.keys(value).length > 0, "Incluye al menos un campo para actualizar.");

export const teacherProfileSchema = z.object({
  professional_title: optionalText(120),
  institution_name: optionalText(180),
  institution_email: z.string().trim().email().max(254).nullable().optional(),
  subjects_or_areas: textList,
  grade_levels: textList,
  support_approach: optionalText(2000),
  professional_bio: optionalText(1500),
  preferred_contact_method: contactMethod
}).strict().refine((value) => Object.keys(value).length > 0, "Incluye al menos un campo para actualizar.");
