import { z } from "zod";

const email = z
  .string()
  .trim()
  .toLowerCase()
  .email()
  .max(254);

const password = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Contraseña demasiado larga.",
  );

const code = z.string().regex(/^\d{6}$/);

export const registerSchema = z
  .object({
    email,
    password,
    fullName: z.string().trim().min(2).max(80),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    email,
    code,
  })
  .strict();

export const emailOnlySchema = z
  .object({
    email,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    email,
    code,
    newPassword: password,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1).max(72),
  })
  .strict();

export const refreshSessionSchema = z
  .object({
    refreshToken: z.string().min(8).max(4096),
  })
  .strict();

export const accountTypeSchema = z
  .object({
    accountType: z.enum([
      "autistic_person",
      "parent_guardian",
      "teacher",
    ]),
  })
  .strict();