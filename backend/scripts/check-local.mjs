import { z } from "zod";

export const emotionSchema = z
  .object({
    emotion: z.enum([
      "alegría",
      "calma",
      "tristeza",
      "ansiedad",
      "enojo",
      "frustración",
      "cansancio",
      "saturación",
      "otro",
    ]),
    intensity: z.number().int().min(1).max(5),
    note: z.string().trim().max(1000).optional(),
  })
  .strict();

export const observationSchema = z
  .object({
    studentId: z.uuid(),
    content: z.string().trim().min(1).max(4000),
    visibility: z.enum([
      "private",
      "authorized_team",
      "tutor_shared",
    ]),
  })
  .strict();