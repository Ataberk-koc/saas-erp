"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { InvoiceStatus } from "@prisma/client"

// 👇 YENİ: Fatura Kalemi için Tip Tanımı
// Bu sayede "any" kullanmak zorunda kalmıyoruz.
interface InvoiceItemInput {
  productId: string;
  quantity: number;
  price: number;
  vatRate: number;
}

// ---------------------------------------------------------
// 1. FATURA OLUŞTURMA (Stok Düşmeli)
// ---------------------------------------------------------
// FormData'dan parametreleri doğru şekilde çıkartıyoruz
export async function createInvoice(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  // FormData'dan parametreleri çıkar
  const customerId = formData.get("customerId") as string
  const productId = formData.get("productId") as string
  const quantity = parseInt(formData.get("quantity") as string)
  const vatRate = parseInt(formData.get("vatRate") as string)
  const dueDate = formData.get("dueDate") as string

  if (!customerId || !productId || !quantity) {
    return { error: "Gerekli alanlar eksik!" }
  }

  // Ürünü bul (fiyatı almak için)
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) {
    return { error: "Ürün bulunamadı!" }
  }

  const items: InvoiceItemInput[] = [{
    productId: productId,
    quantity: quantity,
    price: Number(product.price),
    vatRate: vatRate
  }]

  // Fatura Numarası Hesapla (Son numara + 1)
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { number: 'desc' }
  })
  const nextNumber = (lastInvoice?.number || 0) + 1

  try {
    // TRANSACTION BAŞLATIYORUZ (Hepsi ya olur ya hiçbiri olmaz)
    await prisma.$transaction(async (tx) => {
      
      // A. Faturayı ve Kalemlerini Kaydet
      await tx.invoice.create({
        data: {
          number: nextNumber,
          date: new Date(),
          dueDate: dueDate ? new Date(dueDate) : new Date(),
          tenantId: user.tenantId,
          customerId: customerId,
          status: "PENDING", // Varsayılan: Bekliyor
          items: {
            // item tipini burada da belirttik
            create: items.map((item: InvoiceItemInput) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              vatRate: item.vatRate
            }))
          }
        }
      })

      // B. STOK DÜŞME İŞLEMİ (📉)
      // Her kalem için döngüye girip stoğu azaltıyoruz
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity // Satılan miktar kadar düş
            }
          }
        })
      }
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/products") // Stok değiştiği için ürünleri de yenile
    return { success: true }

  } catch (error) {
    console.error("Fatura oluşturma hatası:", error)
    return { error: "Fatura oluşturulurken hata oluştu." }
  }
}

// ---------------------------------------------------------
// 2. DURUM GÜNCELLEME (Ödendi / İptal / Bekliyor)
// ---------------------------------------------------------
export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    await prisma.invoice.update({
      where: { 
        id: id,
        tenantId: user.tenantId 
      },
      data: { status: status }
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${id}`)
    return { success: true }
  } catch {
    return { error: "Durum güncellenirken hata oluştu." }
  }
}

// ---------------------------------------------------------
// 3. FATURA SİLME (Stok İadeli)
// ---------------------------------------------------------
export async function deleteInvoice(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!", success: false }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!", success: false }

  try {
    // TRANSACTION BAŞLATIYORUZ
    await prisma.$transaction(async (tx) => {
      
      // A. Silinecek faturayı ve kalemlerini bul
      const invoice = await tx.invoice.findUnique({
        where: { id: id },
        include: { items: true }
      })

      if (!invoice) throw new Error("Fatura bulunamadı")

      // B. STOK İADE İŞLEMİ (📈)
      // Silinen faturadaki ürünleri stoğa geri ekle
      for (const item of invoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity // Adet kadar geri ekle
            }
          }
        })
      }

      // C. Önce kalemleri sil
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })

      // D. Sonra faturayı sil
      await tx.invoice.delete({
        where: { id: id }
      })
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/products") // Stok geri geldiği için listeyi yenile
    return { success: true, message: "Fatura başarıyla silindi!" }
  } catch (error) {
    console.error("Silme hatası:", error)
    return { error: "Silme işlemi başarısız oldu!", success: false }
  }
}