// app/actions/customer.ts
"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { customerSchema } from "@/lib/schemas" // 👈 Şemayı import ettik

export async function addCustomer(formData: FormData) {
  // 1. Oturum kontrolü
  const session = await auth()
  if (!session?.user?.email) {
    return { error: "Yetkisiz işlem!" }
  }

  // 2. Kullanıcının Tenant ID'sini bul
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.tenantId) {
    return { error: "Kullanıcı veya Şirket bulunamadı!" }
  }

  // 3. Form verilerini al ve Hazırla
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    type: formData.get("type"), // "BUYER" veya "SUPPLIER"
    address: formData.get("address"),
  }

  // 4. Zod ile Validasyon (Denetleme) Yap 🛡️
  const validation = customerSchema.safeParse(rawData)

  // Eğer validasyon başarısızsa ilk hatayı döndür
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  // Validasyondan geçen temiz veriyi al
  const { name, email, phone, type, address } = validation.data

  // 5. Veritabanına kaydet
  try {
    await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        type, // Zod sayesinde buranın BUYER veya SUPPLIER olduğu garanti
        address,
        tenantId: user.tenantId,
      },
    })

    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch {
    return { error: "Kayıt sırasında veritabanı hatası oluştu." }
  }
}

export async function deleteCustomer(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }
  
  // 👇 SİLME İŞLEMİNİ SADECE ADMIN YAPABİLİR
  if (session.user.role !== "ADMIN") {
    return { error: "Müşteri silme yetkiniz yok! Sadece Yönetici silebilir." }
  }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    // Transaction ile güvenli silme
    await prisma.$transaction(async (tx) => {
      // 1. Müşterinin faturalarını bul
      const invoices = await tx.invoice.findMany({
        where: { customerId: id }
      })

      // 2. O faturalara ait kalemleri sil
      for (const inv of invoices) {
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: inv.id }
        })
      }

      // 3. Faturaların kendisini sil
      await tx.invoice.deleteMany({
        where: { customerId: id }
      })

      // 4. Müşteriyi sil
      await tx.customer.delete({
        where: { id: id }
      })
    })

    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch {
    return { error: "Müşteri silinirken hata oluştu." }
  }
}