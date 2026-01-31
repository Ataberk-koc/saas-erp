"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import bcrypt from "bcryptjs"
import { Role } from "@prisma/client"

// PERSONEL EKLEME
export async function addTeamMember(formData: FormData) {
  const session = await auth()
  // Sadece Admin ekleme yapabilir
  if (!session?.user?.email || session.user.role !== "ADMIN") {
    return { error: "Yetkisiz işlem! Sadece Yönetici personel ekleyebilir." }
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = formData.get("role") as Role

  // Basit validasyon
  if (!name || !email || !password || !role) {
    return { error: "Tüm alanları doldurun." }
  }

  // Email kontrolü (Sistemde var mı?)
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "Bu e-posta adresi zaten kullanımda." }
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role, // 👈 Seçilen rolü (ACCOUNTANT veya USER) veriyoruz
        tenantId: user.tenantId // Admin ile aynı şirkete bağlıyoruz
      }
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch {
    return { error: "Personel eklenirken hata oluştu." }
  }
}

// PERSONEL SİLME
export async function removeTeamMember(userId: string) {
  const session = await auth()
  if (!session?.user?.email || session.user.role !== "ADMIN") {
    return { error: "Yetkisiz işlem!" }
  }

  const currentUser = await prisma.user.findUnique({ where: { email: session.user.email } })

  try {
    // Kendini silemesin
    if (currentUser?.id === userId) {
        return { error: "Kendinizi silemezsiniz." }
    }

    await prisma.user.delete({
      where: { 
        id: userId,
        tenantId: currentUser?.tenantId // Sadece kendi şirketinden silebilir
      }
    })

    revalidatePath("/dashboard/settings")
    return { success: true }
  } catch {
    return { error: "Silme işlemi başarısız." }
  }
}