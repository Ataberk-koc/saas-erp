"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Form Doğrulama Şeması
const PurchaseSchema = z.object({
  supplierId: z.string().min(1, "Tedarikçi seçmelisiniz"), // Mevcut Cari ID'si
  documentNumber: z.string().optional(), // Tedarikçinin kestiği fatura no
  date: z.date(),
  items: z.array(z.object({
    productName: z.string().min(1, "Ürün adı giriniz"),
    quantity: z.number().min(1),
    price: z.number().min(0), // Alış Fiyatı
    vatRate: z.number().default(20)
  }))
})

export async function createPurchaseInvoice(data: z.infer<typeof PurchaseSchema>) {
  const session = await auth()
  if (!session?.user?.tenantId) return { error: "Yetkisiz işlem" }

  const validated = PurchaseSchema.safeParse(data)
  if (!validated.success) return { error: "Form verileri geçersiz" }

  const { supplierId, documentNumber, date, items } = validated.data

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      
      // 1. Bizim için sıradaki iç takip numarasını bul
      const lastInvoice = await tx.invoice.findFirst({
        where: { tenantId: session.user.tenantId },
        orderBy: { number: 'desc' }
      })
      const nextNumber = (lastInvoice?.number || 0) + 1

      // 2. Faturayı Oluştur (Tipi: PURCHASE)
      const invoice = await tx.invoice.create({
        data: {
          tenantId: session.user.tenantId,
          customerId: supplierId, // Seçilen Cari Hesap
          type: "PURCHASE",       // 👈 ÖNEMLİ: Alış Faturası
          number: nextNumber,     // İç takip no
          documentNumber: documentNumber, // Tedarikçi Fatura No
          date: date,
          dueDate: date,
          status: "PAID",         // Alışlar genelde peşin/ödendi girilir
        }
      })

      // 3. Kalemleri İşle (Stok Artırma & Ürün Oluşturma)
      for (const item of items) {
        let productId = ""

        // A. Ürün isminden kontrol et (Büyük/küçük harf duyarsız)
        const existingProduct = await tx.product.findFirst({
          where: { 
            name: { equals: item.productName, mode: "insensitive" },
            tenantId: session.user.tenantId
          }
        })

        if (existingProduct) {
          // ✅ ÜRÜN VARSA: Stoğu ARTIR
          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              stock: { increment: item.quantity }, // Artırıyoruz
            }
          })
          productId = existingProduct.id
        } else {
          // 🆕 ÜRÜN YOKSA: Otomatik OLUŞTUR
          const newProduct = await tx.product.create({
            data: {
              tenantId: session.user.tenantId,
              name: item.productName,
              stock: item.quantity,      // İlk stok
              price: item.price * (1 + item.vatRate / 100),   // KDV dahil fiyat (ör: 10000 * 1.20 = 12000)
              vatRate: item.vatRate
            }
          })
          productId = newProduct.id
        }

        // B. Fatura Kalemini Kaydet
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productId: productId,
            quantity: item.quantity,
            price: item.price,
            vatRate: item.vatRate
          }
        })

        // C. Log Kaydı (PURCHASE)
        await tx.inventoryLog.create({
          data: {
            tenantId: session.user.tenantId,
            productId: productId,
            change: item.quantity, // Pozitif değer
            newStock: (existingProduct?.stock || 0) + item.quantity,
            type: "PURCHASE",      // 👈 Log Tipi: ALIM
            note: `Alış Faturası #${documentNumber || nextNumber}`
          }
        })
      }
    })

    revalidatePath("/dashboard/products")
    revalidatePath("/dashboard/invoices")
    return { success: "Alış faturası ve stok girişi başarılı!" }

  } catch (error) {
    console.error("Hata:", error)
    return { error: "İşlem başarısız oldu." }
  }
}