"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { customerSchema } from "@/lib/schemas"
// Eğer sanitizeInput utils dosyasında yoksa hata almamak için buraya basitçe ekleyebilirsin
// import { sanitizeInput } from "@/lib/utils" 

export async function addCustomer(formData: FormData) {
  // 1. Oturum kontrolü
  const session = await auth()
  if (!session?.user?.email) {
    return { error: "Yetkisiz işlem!" }
  }

  // 2. Şirket (Tenant) Bul
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.tenantId) {
    return { error: "Kullanıcı veya Şirket bulunamadı!" }
  }

  // 3. Verileri Al
  const emailInput = (formData.get("email") as string) || ""
  
  const rawData = {
    name: formData.get("name") as string, 
    email: emailInput.trim(), 
    phone: (formData.get("phone") as string) || "",
    type: formData.get("type"), 
    address: (formData.get("address") as string) || "",
  }

  // 🛑 4. KESİN KURAL: MANUEL UZUNLUK KONTROLÜ
  if (rawData.email.length > 25) {
     return { error: "E-posta adresi çok uzun! Maksimum 25 karakter girebilirsiniz." }
  }

  // 5. Zod Validasyonu
  const validation = customerSchema.safeParse(rawData)
  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { name, email, phone, type, address } = validation.data

  // 6. Veritabanı Kaydı
  try {
    // Aynı mailden var mı kontrolü
    if (email) {
        const existing = await prisma.customer.findFirst({
            where: { 
                email: email,
                tenantId: user.tenantId
            }
        })
        if (existing) {
            return { error: "Bu e-posta adresiyle kayıtlı bir müşteri zaten var." }
        }
    }

    await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        type: type as "BUYER" | "SUPPLIER",
        address,
        tenantId: user.tenantId,
      },
    })

    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch (error) {
    console.error("Hata:", error)
    return { error: "Kayıt sırasında teknik bir hata oluştu." }
  }
}

// 👇 İŞTE BU FONKSİYON EKSİKTİ, GERİ EKLİYORUZ:
export async function deleteCustomer(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  // Sadece Admin silebilir
  // if (user.role !== "ADMIN") {
  //     return { error: "Bu işlemi sadece yöneticiler yapabilir." }
  // }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Faturaları ve kalemlerini sil
      const invoices = await tx.invoice.findMany({
        where: { customerId: id }
      })

      for (const inv of invoices) {
        await tx.invoiceItem.deleteMany({ where: { invoiceId: inv.id } })
      }
      
      await tx.invoice.deleteMany({ where: { customerId: id } })

      // 2. Müşteriyi sil
      await tx.customer.delete({ where: { id: id } })
    })

    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch {
    return { error: "Müşteri silinirken bir hata oluştu." }
  }
}