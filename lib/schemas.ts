import { z } from "zod";

// XSS Koruma: Tehlikeli HTML/script içerikleri için Zod transformü
const xssSafeString = (field: string, minLength = 0) =>
  z.string()
    .min(minLength, `${field} en az ${minLength} karakter olmalı.`)
    .refine(
      (val) => !/<script|<\/script|<iframe|<object|<embed|javascript:|on\w+\s*=/i.test(val),
      { message: `${field} alanında güvenlik riski oluşturan içerik tespit edildi.` }
    );

const xssSafeOptionalString = () =>
  z.string()
    .refine(
      (val) => !val || !/<script|<\/script|<iframe|<object|<embed|javascript:|on\w+\s*=/i.test(val),
      { message: "Bu alanda güvenlik riski oluşturan içerik tespit edildi." }
    )
    .optional()
    .or(z.literal(""));

// 1. GİRİŞ & KAYIT ŞEMALARI
export const signInSchema = z.object({
  email: z.string().email("Geçersiz e-posta adresi."),
  password: z.string().min(1, "Şifre boş olamaz."),
});

export const registerSchema = z.object({
  name: xssSafeString("İsim", 2),
  email: z.string().email("Geçersiz e-posta adresi."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  role: z.enum(["ADMIN", "ACCOUNTANT", "USER"]).optional(),
});

// 2. CARİ HESAP (MÜŞTERİ) ŞEMASI
export const customerSchema = z.object({
  name: xssSafeString("Firma/Kişi adı"),
  email: z.string().max(25, "E-posta adresi en fazla 25 karakter olmalı.").email("Geçersiz e-posta formatı.").optional().or(z.literal("")),
  phone: xssSafeOptionalString(),
  type: z.enum(["BUYER", "SUPPLIER"]),
  address: xssSafeOptionalString(),
});

// 3. ÜRÜN ŞEMASI
export const productSchema = z.object({
  name: xssSafeString("Ürün adı", 2),
  price: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz."),
  stock: z.coerce.number().int().min(0, "Stok 0'dan küçük olamaz."),
  vatRate: z.coerce.number().min(0).max(100),
});

// 4. ŞİRKET AYARLARI ŞEMASI
export const companySchema = z.object({
  name: xssSafeString("Şirket adı", 2),
  email: z.string().email("Geçersiz e-posta.").optional().or(z.literal("")),
  phone: xssSafeOptionalString(),
  website: z.string().url("Geçersiz web sitesi (http://...)").optional().or(z.literal("")),
  address: xssSafeOptionalString(),
  taxOffice: xssSafeOptionalString(),
  taxNumber: xssSafeOptionalString(),
  iban: xssSafeOptionalString(),
});

export const updateProfileSchema = z.object({
  name: xssSafeString("İsim", 2),
});

// 6. ŞİFRE DEĞİŞTİRME
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi girmelisiniz."),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı."),
  confirmPassword: z.string().min(6, "Şifre tekrarı en az 6 karakter olmalı."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Yeni şifreler uyuşmuyor.",
  path: ["confirmPassword"],
});