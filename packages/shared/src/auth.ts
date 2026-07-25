import { z } from "zod";

export const emailSchema = z
  .string()
  .min(1, "El correo es obligatorio")
  .email("Eso no parece un correo válido");

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(128, "La contraseña es demasiado larga");

export const nameSchema = z
  .string()
  .min(1, "Tu nombre es obligatorio")
  .max(80, "Tu nombre es demasiado largo")
  .trim();

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema.min(1, "Introduce tu contraseña"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
