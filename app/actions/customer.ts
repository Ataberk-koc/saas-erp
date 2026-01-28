// app/actions/customer.ts
"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function addCustomer(formData: FormData) {
  // 1. Oturum kontrolü
  const session = await auth()
  if (!session?.user?.email) {
    return { error: "Yetkisiz işlem!" }
  }

  // 2. Kullanıcının Tenant ID'sini bul (Güvenlik)
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.tenantId) {
    return { error: "Kullanıcı veya Şirket bulunamadı!" }
  }

  // 3. Form verilerini al
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const phone = formData.get("phone") as string
  const type = formData.get("type") as string // "BUYER" veya "SUPPLIER"

  // 4. Veritabanına kaydet
  try {
    await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        type,
        tenantId: user.tenantId,
        address: formData.get("address") as string,
      },
    })

    // 5. Sayfayı yenile ki yeni müşteri listede görünsün
    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch {
    return { error: "Kayıt sırasında bir hata oluştu." }
  }
}

export async function deleteCustomer(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    // Transaction ile güvenli silme (Önce faturaları, sonra müşteriyi)
    await prisma.$transaction(async (tx) => {
      // 1. Müşterinin faturalarını bul
      const invoices = await tx.invoice.findMany({
        where: { customerId: id }
      })

      // 2. O faturalara ait kalemleri (items) sil
      for (const inv of invoices) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: inv.id }
        })
      }

      // 3. Faturaların kendisini sil
      await tx.invoice.deleteMany({
        where: { customerId: id }
      })

      // 4. Ve nihayet müşteriyi sil
      await tx.customer.delete({
        where: { id: id }
      })
    })

    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch (error) {
    return { error: "Müşteri silinirken hata oluştu." }
  }
}