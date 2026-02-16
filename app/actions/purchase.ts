"use server"

import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { auth } from "@/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sanitizeInput } from "@/lib/utils"

// Form Doğrulama Şeması
const PurchaseSchema = z.object({
  supplierId: z.string().min(1, "Tedarikçi seçmelisiniz"), // Mevcut Cari ID'si
  documentNumber: z.string().optional(), // Tedarikçinin kestiği fatura no
  gcbNo: z.string().optional(), // Gümrük Çıkış Beyannamesi Numarası
  date: z.date(),
  currency: z.string().default("TRY"),
  exchangeRate: z.number().default(1),
  items: z.array(z.object({
    productName: z.string().min(1, "Ürün adı giriniz"),
    quantity: z.number().min(1),
    price: z.number().min(0), // Alış Fiyatı
    vatRate: z.number().default(20),
    unit: z.string().default("Adet")
  }))
})

export async function createPurchaseInvoice(data: z.infer<typeof PurchaseSchema>) {
  const session = await auth()
  if (!session?.user?.tenantId) return { error: "Yetkisiz işlem" }

  const validated = PurchaseSchema.safeParse(data)
  if (!validated.success) return { error: "Form verileri geçersiz" }

  const { supplierId, documentNumber, gcbNo, date, currency, exchangeRate, items } = validated.data

  // XSS temizliği
  const safeDocumentNumber = documentNumber ? sanitizeInput(documentNumber) : undefined
  const safeGcbNo = gcbNo ? sanitizeInput(gcbNo) : undefined
  const safeItems = items.map(item => ({
    ...item,
    productName: sanitizeInput(item.productName)
  }))

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
          documentNumber: safeDocumentNumber, // Tedarikçi Fatura No
          gcbNo: safeGcbNo,                     // GÇB Numarası
          date: date,
          dueDate: date,
          status: "PAID",         // Alışlar genelde peşin/ödendi girilir
          currency: currency,     // 👈 Döviz birimi
          exchangeRate: exchangeRate, // 👈 Kur
        }
      })

      // 3. Kalemleri İşle (Stok Artırma & Ürün Oluşturma)
      for (const item of safeItems) {
        let productId = ""

        // A. Ürün isminden kontrol et (Büyük/küçük harf duyarsız)
        const existingProduct = await tx.product.findFirst({
          where: { 
            name: { equals: item.productName, mode: "insensitive" },
            tenantId: session.user.tenantId
          }
        })

        if (existingProduct) {
          // ✅ ÜRÜN VARSA: Stoğu ARTIR + Fiyatları ve Döviz/Maliyet Güncelle
          await tx.product.update({
            where: { id: existingProduct.id },
            data: {
              stock: { increment: item.quantity },
              price: item.price,        // Satış fiyatını da güncelle (son alış fiyatı)
              buyPrice: item.price,     // Alış fiyatı
              currency: currency,
              exchangeRate: exchangeRate,
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
              price: item.price,        // Birim fiyat (KDV hariç)
              buyPrice: item.price,     // Alış fiyatı
              vatRate: item.vatRate,
              unit: item.unit,          // Birim (Adet, Kg, Metre...)
              currency: currency,       // Döviz birimi (TRY, USD, EUR, GBP)
              exchangeRate: exchangeRate // Kur (Örn: 46.62)
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
            vatRate: item.vatRate,
            unit: item.unit
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
            note: `Alış Faturası #${documentNumber || nextNumber} | Fiyat: ${item.price} ${currency}`
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