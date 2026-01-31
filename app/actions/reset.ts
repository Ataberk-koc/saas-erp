"use server";

import { prisma } from "@/lib/db";
import { generatePasswordResetToken } from "@/lib/tokens";
import { sendPasswordResetEmail } from "@/lib/mail";
import bcrypt from "bcryptjs";

// 1. ŞİFRE SIFIRLAMA MAİLİ GÖNDER
export async function resetPassword(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email) {
    return { error: "E-posta adresi gerekli." };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (!existingUser) {
    return { error: "Bu e-posta ile kayıtlı kullanıcı bulunamadı." };
  }

  // Token oluştur ve mail at
  const passwordResetToken = await generatePasswordResetToken(email);
  await sendPasswordResetEmail(passwordResetToken.email, passwordResetToken.token);

  return { success: "Sıfırlama e-postası gönderildi!" };
}

// 2. YENİ ŞİFREYİ KAYDET
export async function newPassword(formData: FormData, token: string | null) {
  const password = formData.get("password") as string;

  if (!token) {
    return { error: "Token bulunamadı!" };
  }

  if (!password) {
    return { error: "Yeni şifre gerekli." };
  }

  // Token veritabanında var mı?
  const existingToken = await prisma.passwordResetToken.findUnique({
    where: { token }
  });

  if (!existingToken) {
    return { error: "Geçersiz veya süresi dolmuş token!" };
  }

  // Token süresi dolmuş mu?
  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    return { error: "Token süresi dolmuş!" };
  }

  // Kullanıcıyı bul
  const existingUser = await prisma.user.findUnique({
    where: { email: existingToken.email }
  });

  if (!existingUser) {
    return { error: "Kullanıcı bulunamadı." };
  }

  // Şifreyi güncelle
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id: existingUser.id },
    data: { password: hashedPassword }
  });

  // Kullanılan tokenı sil
  await prisma.passwordResetToken.delete({
    where: { id: existingToken.id }
  });

  return { success: "Şifreniz başarıyla güncellendi!" };
}