"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { InvoiceStatus } from "@prisma/client"
import { checkLimit } from "@/app/actions/limiter"

// Fatura Kalemi için Tip Tanımı
interface InvoiceItemInput {
  productId: string;
  quantity: number;
  price: number;
  vatRate: number;
}

// ---------------------------------------------------------
// 1. FATURA OLUŞTURMA (Çoklu Kalem ve Stok Düşmeli)
// ---------------------------------------------------------
export async function createInvoice(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  const hasLimit = await checkLimit("invoices")
  if (!hasLimit) {
    return { error: "⚠️ Ücretsiz paket limitiniz doldu (Max 5 Fatura). Lütfen Pro pakete geçin." }
  }
  
  // Form verilerini al
  const customerId = formData.get("customerId") as string
  const date = formData.get("date") as string
  const itemsString = formData.get("items") as string // JSON string olarak geliyor

  if (!customerId || !date || !itemsString) {
    return { error: "Gerekli alanlar eksik!" }
  }

  let items: InvoiceItemInput[] = []
  try {
    items = JSON.parse(itemsString)
  } catch {
    return { error: "Ürün listesi hatalı!" }
  }

  if (items.length === 0) {
    return { error: "En az bir ürün eklemelisiniz." }
  }

  // Fatura Numarası Hesapla
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { number: 'desc' }
  })
  const nextNumber = (lastInvoice?.number || 0) + 1

  try {
    await prisma.$transaction(async (tx) => {
      
      // A. Faturayı ve Kalemlerini Kaydet
      await tx.invoice.create({
        data: {
          number: nextNumber,
          date: new Date(date),
          dueDate: new Date(date), // Vade tarihi şu an fatura tarihi ile aynı olsun
          tenantId: user.tenantId,
          customerId: customerId,
          status: "PENDING",
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              vatRate: item.vatRate
            }))
          }
        }
      })

      // B. STOK DÜŞME İŞLEMİ (📉)
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity
            }
          }
        })
      }
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/products")
    
  } catch (error) {
    console.error("Fatura oluşturma hatası:", error)
    return { error: "Fatura oluşturulurken hata oluştu." }
  }
  
  redirect("/dashboard/invoices")
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
    await prisma.$transaction(async (tx) => {
      
      const invoice = await tx.invoice.findUnique({
        where: { id: id },
        include: { items: true }
      })

      if (!invoice) throw new Error("Fatura bulunamadı")

      // STOK İADE İŞLEMİ (📈)
      // Silinen faturadaki ürünleri stoğa geri ekle
      for (const item of invoice.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity
            }
          }
        })
      }

      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id }
      })

      await tx.invoice.delete({
        where: { id: id }
      })
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath("/dashboard/products")
    return { success: true, message: "Fatura başarıyla silindi!" }
  } catch (error) {
    console.error("Silme hatası:", error)
    return { error: "Silme işlemi başarısız oldu!", success: false }
  }
}

// ---------------------------------------------------------
// 4. FATURA GÜNCELLEME / DÜZENLEME (Stok Düzeltmeli) 🆕
// ---------------------------------------------------------
export async function updateInvoice(formData: FormData) {
    const session = await auth();
    if (!session?.user?.email) return { error: "Yetkisiz işlem." };
    
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user?.tenantId) return { error: "Şirket bulunamadı." };
  
    const invoiceId = formData.get("id") as string;
    const customerId = formData.get("customerId") as string;
    const date = formData.get("date") as string;
    const itemsString = formData.get("items") as string; 
  
    if (!invoiceId || !customerId || !date || !itemsString) {
      return { error: "Lütfen tüm alanları doldurun." };
    }
  
    let items: InvoiceItemInput[] = [];
    try {
      items = JSON.parse(itemsString);
    } catch {
      return { error: "Fatura kalemleri hatalı." };
    }
  
    try {
      await prisma.$transaction(async (tx) => {
        
        // A. Fatura Başlığını Güncelle
        await tx.invoice.update({
          where: { 
            id: invoiceId,
            tenantId: user.tenantId
          },
          data: {
            customerId,
            date: new Date(date),
            dueDate: new Date(date),
          },
        });
  
        // B. ESKİ STOKLARI İADE ET (Revert Stock) 📈
        // Faturadaki eski ürünleri bulup stoklarını geri ekliyoruz
        const oldInvoice = await tx.invoice.findUnique({
            where: { id: invoiceId },
            include: { items: true }
        });

        if (oldInvoice) {
            for (const oldItem of oldInvoice.items) {
                await tx.product.update({
                    where: { id: oldItem.productId },
                    data: { stock: { increment: oldItem.quantity } }
                });
            }
        }

        // C. Eski Kalemleri Sil
        await tx.invoiceItem.deleteMany({
          where: { invoiceId: invoiceId },
        });
  
        // D. Yeni Kalemleri Ekle ve YENİ STOK DÜŞ (Apply New Stock) 📉
        for (const item of items) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: invoiceId,
              productId: item.productId,
              quantity: item.quantity,
              price: item.price, 
              vatRate: item.vatRate,
            },
          });

          // Yeni miktarı stoktan düş
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } }
          });
        }
      });
  
      revalidatePath("/dashboard/invoices")
      revalidatePath("/dashboard/products")
      
    } catch (error) {
      console.error("Fatura güncelleme hatası:", error);
      return { error: "Fatura güncellenemedi." };
    }
  
    redirect("/dashboard/invoices");
}