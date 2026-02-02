import { z } from "zod";

// 1. GİRİŞ & KAYIT ŞEMALARI
export const signInSchema = z.object({
  email: z.string().email("Geçersiz e-posta adresi."),
  password: z.string().min(1, "Şifre boş olamaz."),
});

export const registerSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalı."),
  email: z.string().email("Geçersiz e-posta adresi."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  role: z.enum(["ADMIN", "ACCOUNTANT", "USER"]).optional(),
});

// 2. CARİ HESAP (MÜŞTERİ) ŞEMASI
export const customerSchema = z.object({
  name: z.string().min(2, "Firma/Kişi adı en az 2 karakter olmalı."),
  email: z.string().email("Geçersiz e-posta formatı.").optional().or(z.literal("")),
  phone: z.string().optional(),
  // 👇 DÜZELTME 1: "errorMap" kısmını kaldırdık, sadece enum tanımladık.
  type: z.enum(["BUYER", "SUPPLIER"]),
  address: z.string().optional(),
});

// 3. ÜRÜN ŞEMASI
export const productSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalı."),
  // 👇 DÜZELTME 2: "invalid_type_error" parametresini kaldırdık.
  // z.coerce.number() zaten sayıya çeviremezse hata verir.
  price: z.coerce.number().min(0, "Fiyat 0'dan küçük olamaz."),
  stock: z.coerce.number().int().min(0, "Stok 0'dan küçük olamaz."),
  vatRate: z.coerce.number().min(0).max(100),
});

// 4. ŞİRKET AYARLARI ŞEMASI
export const companySchema = z.object({
  name: z.string().min(2, "Şirket adı zorunludur."),
  email: z.string().email("Geçersiz e-posta.").optional().or(z.literal("")),
  phone: z.string().optional(),
  website: z.string().url("Geçersiz web sitesi (http://...)").optional().or(z.literal("")),
  address: z.string().optional(),
  taxOffice: z.string().optional(),
  taxNumber: z.string().optional(),
  iban: z.string().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır."),
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