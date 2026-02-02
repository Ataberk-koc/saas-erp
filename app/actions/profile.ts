"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { updateProfileSchema, changePasswordSchema } from "@/lib/schemas"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs" // Şifre kırma/eşleştirme için

// 1. İSİM GÜNCELLEME
export async function updateProfile(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Oturum açmanız gerekiyor." }

  const rawData = { name: formData.get("name") }
  const validation = updateProfileSchema.safeParse(rawData)

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: { name: validation.data.name }
    })

    revalidatePath("/dashboard/profile")
    return { success: true, message: "Profil bilgileri güncellendi." }
  } catch {
    return { error: "Güncelleme sırasında hata oluştu." }
  }
}

// 2. ŞİFRE DEĞİŞTİRME
export async function changePassword(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Oturum açmanız gerekiyor." }

  const rawData = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  }

  const validation = changePasswordSchema.safeParse(rawData)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { currentPassword, newPassword } = validation.data

  try {
    // 1. Kullanıcıyı bul (Şifre hash'ini almak için)
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || !user.password) {
      return { error: "Kullanıcı bulunamadı." }
    }

    // 2. Mevcut şifre doğru mu kontrol et
    const passwordsMatch = await bcrypt.compare(currentPassword, user.password)
    if (!passwordsMatch) {
      return { error: "Mevcut şifreniz hatalı!" }
    }

    // 3. Yeni şifreyi hashle
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 4. Güncelle
    await prisma.user.update({
      where: { email: session.user.email },
      data: { password: hashedPassword }
    })

    revalidatePath("/dashboard/profile")
    return { success: true, message: "Şifreniz başarıyla değiştirildi." }
  } catch {
    return { error: "Şifre değiştirilirken hata oluştu." }
  }
}