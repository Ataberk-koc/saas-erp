"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { sanitizeInput } from "@/lib/utils"

export async function updateCompanyInfo(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  if (session.user.role !== "ADMIN") {
    return { error: "Ayarları değiştirme yetkiniz yok! Sadece Yönetici değiştirebilir." }
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: sanitizeInput(formData.get("name") as string),
        email: sanitizeInput(formData.get("email") as string),
        phone: sanitizeInput(formData.get("phone") as string),
        address: sanitizeInput(formData.get("address") as string),
        website: sanitizeInput(formData.get("website") as string),
        taxOffice: sanitizeInput(formData.get("taxOffice") as string),
        taxNumber: sanitizeInput(formData.get("taxNumber") as string),
        iban: sanitizeInput(formData.get("iban") as string),
      }
    })

    revalidatePath("/dashboard/settings")
    // Fatura detay sayfasını da yenile ki oradaki bilgiler de güncellensin
    revalidatePath("/dashboard/invoices") 
    return { success: true }
  } catch {
    return { error: "Ayarlar güncellenirken hata oluştu." }
  }
}