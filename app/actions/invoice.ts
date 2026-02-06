"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { InvoiceType, InvoiceStatus } from "@prisma/client"

interface InvoiceItemInput {
  productId: string
  quantity: number
  price: number
  vatRate: number
}

export async function createInvoice(formData: FormData, items: InvoiceItemInput[]) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı" }

  const customerId = formData.get("customerId") as string
  const type = formData.get("type") as InvoiceType
  const dateStr = formData.get("date") as string
  const date = dateStr ? new Date(dateStr) : new Date()
  
  // Fatura Numarası
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { number: 'desc' }
  })
  const number = (lastInvoice?.number || 0) + 1

  try {
    // 1. Faturayı Oluştur
    await prisma.invoice.create({
      data: {
        number,
        date,
        dueDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000), 
        status: "PAID", 
        type,
        tenantId: user.tenantId,
        customerId,
        items: {
          create: items.map((item) => ({
             productId: item.productId,
             quantity: item.quantity,
             price: item.price, // Veritabanına saf fiyatı (10.000) yazıyoruz
             vatRate: item.vatRate
          }))
        }
      }
    })

    // 2. Stok ve Maliyet Güncelleme
    for (const item of items) {
      if (type === 'SALES') {
        // Satışsa stoktan düş
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      } else if (type === 'PURCHASE') {
        // Alışsa:
        // A) Stoğu artır
        // B) Alış Fiyatını (Maliyetini) güncelle
        
        // ⚠️ KONTROL: Eğer "fazla ekliyor" diyorsan, burada 'increment' kullanılmış olabilir.
        // Doğrusu 'set' yani doğrudan atamadır: buyPrice: item.price
        
        await prisma.product.update({
          where: { id: item.productId },
          data: { 
            stock: { increment: item.quantity }, // Stok ÜZERİNE eklenir (10+5=15)
            buyPrice: item.price                 // Fiyat YENİSİYLE değiştirilir (10.000)
          }
        })
      }
    }

    revalidatePath("/dashboard")
    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/products")
    return { success: true }

  } catch (error) {
    console.log("Fatura Hatası:", error)
    return { error: "Fatura oluşturulurken hata çıktı." }
  }
}

// ... deleteInvoice ve updateInvoiceStatus fonksiyonları aynı kalabilir ...
export async function deleteInvoice(id: string) {
  try {
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.invoice.delete({ where: { id } })
    revalidatePath("/dashboard/invoices")
    return { success: true }
  } catch {
    return { success: false, error: "Fatura silinirken bir hata oluştu." }
  }
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
    // ... (önceki kodun aynısı)
    await prisma.invoice.update({ where: { id }, data: { status } })
    revalidatePath("/dashboard/invoices")
    return { success: true }
    // ...
}