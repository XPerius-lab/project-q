import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi girin"),
  password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(2, "Ad Soyad en az 2 karakter olmalı"),
    email: z.string().email("Geçerli bir e-posta adresi girin"),
    phone: z
      .string()
      .regex(/^\+?[0-9]{9,15}$/, "Geçerli bir telefon numarası girin")
      .optional()
      .or(z.literal("")),
    password: z.string().min(8, "Şifre en az 8 karakter olmalı"),
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Şifreler eşleşmiyor",
    path: ["passwordConfirm"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;
