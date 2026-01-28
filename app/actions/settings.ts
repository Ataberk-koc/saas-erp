"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function updateCompanyInfo(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    await prisma.tenant.update({
      where: { id: user.tenantId },
      data: {
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        address: formData.get("address") as string,
        website: formData.get("website") as string,
        taxOffice: formData.get("taxOffice") as string,
        taxNumber: formData.get("taxNumber") as string,
        iban: formData.get("iban") as string,
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