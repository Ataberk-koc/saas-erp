"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { InvoiceType, InvoiceStatus } from "@prisma/client"

// Tipler
interface InvoiceItemInput {
  productId: string
  quantity: number
  price: number
  vatRate: number
  unit?: string
  purchasePrice?: number 
  profit?: number        
}

interface PaymentInput {
  amount: number
  date: Date | string
  note?: string
}

// ------------------------------------------------------------------
// 1. FATURA OLUŞTURMA (Create)
// ------------------------------------------------------------------
export async function createInvoice(
  formData: FormData, 
  items: InvoiceItemInput[], 
  payments: PaymentInput[] = []
) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı" }

  const customerId = formData.get("customerId") as string
  const type = formData.get("type") as InvoiceType
  const dateStr = formData.get("date") as string
  const date = dateStr ? new Date(dateStr) : new Date()

  // Fatura Numarası Üret
  const lastInvoice = await prisma.invoice.findFirst({
    where: { tenantId: user.tenantId },
    orderBy: { number: 'desc' }
  })
  const number = (lastInvoice?.number || 0) + 1

  // Durum Hesabı
  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity * (1 + item.vatRate/100)), 0)
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  
  let status: InvoiceStatus = "PENDING"
  if (paidAmount >= totalAmount - 0.1) status = "PAID" // Ufak kuruş farkı toleransı

  try {
    // Faturayı Kaydet (Değişken atamasını kaldırdık)
    await prisma.invoice.create({
      data: {
        number,
        date,
        dueDate: new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000),
        status,
        type,
        tenantId: user.tenantId,
        customerId,
        currency: formData.get("currency") as string || "TRY",        
        exchangeRate: Number(formData.get("exchangeRate")) || 1,   
        items: {
          create: items.map((item) => ({
             productId: item.productId,
             quantity: item.quantity,
             price: item.price,
             vatRate: item.vatRate,
             unit: item.unit || "Adet",
             purchasePrice: item.purchasePrice || 0, 
             profit: item.profit || 0
          }))
        },
        payments: {
          create: payments.map(p => ({
            amount: p.amount,
            date: new Date(p.date),
            note: p.note
          }))
        }
      }
    })

    // Stok ve Maliyet Güncellemesi
    for (const item of items) {
      if (type === 'SALES') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        })
      } else if (type === 'PURCHASE') {
        await prisma.product.update({
          where: { id: item.productId },
          data: { 
            stock: { increment: item.quantity },
            buyPrice: item.price
          }
        })
      }
    }

    revalidatePath("/dashboard/invoices")
    return { success: true }

  } catch (error) {
    console.log("Hata:", error)
    return { error: "Fatura oluşturulamadı." }
  }
}

// ------------------------------------------------------------------
// 2. FATURA GÜNCELLEME (Update)
// ------------------------------------------------------------------
export async function updateInvoice(
  id: string,
  formData: FormData,
  items: InvoiceItemInput[],
  payments: PaymentInput[]
) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }
  
  const customerId = formData.get("customerId") as string
  const dateStr = formData.get("date") as string
  const date = dateStr ? new Date(dateStr) : new Date()

  const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity * (1 + item.vatRate/100)), 0)
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const status: InvoiceStatus = paidAmount >= totalAmount - 0.1 ? "PAID" : "PENDING"

  try {
    // Eski detayları temizle
    await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
    await prisma.payment.deleteMany({ where: { invoiceId: id } })

    // Yenileri ekle
    await prisma.invoice.update({
      where: { id },
      data: {
        customerId,
        date,
        status,
        items: {
          create: items.map(item => ({
             productId: item.productId,
             quantity: item.quantity,
             price: item.price,
             vatRate: item.vatRate
          }))
        },
        payments: {
          create: payments.map(p => ({
            amount: p.amount,
            date: new Date(p.date),
            note: p.note
          }))
        }
      }
    })

    revalidatePath("/dashboard/invoices")
    revalidatePath(`/dashboard/invoices/${id}`)
    return { success: true }
  } catch (error) {
    console.error(error)
    return { error: "Güncelleme başarısız" }
  }
}

// ------------------------------------------------------------------
// 3. FATURA SİLME
// ------------------------------------------------------------------
export async function deleteInvoice(id: string) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Yetkisiz işlem" }

    try {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } })
        await prisma.payment.deleteMany({ where: { invoiceId: id } })
        await prisma.invoice.delete({ where: { id } })
        
        revalidatePath("/dashboard/invoices")
        return { success: true }
    } catch {
        return { error: "Silinemedi" }
    }
}

// ------------------------------------------------------------------
// 4. DURUM GÜNCELLEME (Manuel)
// ------------------------------------------------------------------
export async function updateInvoiceStatus(id: string, status: InvoiceStatus) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  try {
    await prisma.invoice.update({
      where: { id },
      data: { status },
    })
    revalidatePath(`/dashboard/invoices/${id}`)
    revalidatePath("/dashboard/invoices")
    return { success: true }
  } catch  {
    return { error: "Durum güncellenemedi" }
  }
}

// ------------------------------------------------------------------
// 5. TEKİL ÖDEME EKLEME (Yeni)
// ------------------------------------------------------------------
export async function addPayment(invoiceId: string, amount: number, date: string, note: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  try {
    await prisma.payment.create({
      data: {
        invoiceId,
        amount,
        date: new Date(date),
        note
      }
    })

    // Durumu tekrar hesapla
    await updateInvoiceStatusBasedOnPayments(invoiceId)

    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    return { success: true }
  } catch  {
    return { error: "Ödeme eklenemedi" }
  }
}

// ------------------------------------------------------------------
// 6. ÖDEME SİLME (Yeni)
// ------------------------------------------------------------------
export async function deletePayment(paymentId: string, invoiceId: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  try {
    await prisma.payment.delete({ where: { id: paymentId } })
    
    // Durumu tekrar hesapla
    await updateInvoiceStatusBasedOnPayments(invoiceId)

    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    return { success: true }
  } catch  {
    return { error: "Ödeme silinemedi" }
  }
}

// ------------------------------------------------------------------
// 7. KALANI TAMAMLAMA (Hızlı Tahsilat)
// ------------------------------------------------------------------
export async function completePayment(id: string, amount: number) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  try {
    await prisma.payment.create({
      data: {
        invoiceId: id,
        amount: amount,
        note: "Hızlı Tahsilat (Tamamı)",
        date: new Date()
      }
    })

    await prisma.invoice.update({ where: { id }, data: { status: "PAID" } })

    revalidatePath(`/dashboard/invoices/${id}`)
    revalidatePath("/dashboard/invoices")
    return { success: true }
  } catch {
    return { error: "İşlem başarısız" }
  }
}

// ------------------------------------------------------------------
// 8. İPTAL ETME
// ------------------------------------------------------------------
export async function cancelInvoice(id: string) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Yetkisiz işlem" }
  
    try {
      await prisma.invoice.update({
        where: { id },
        data: { status: "CANCELLED" } 
      })
  
      revalidatePath(`/dashboard/invoices/${id}`)
      revalidatePath("/dashboard/invoices")
      return { success: true }
    } catch {
      return { error: "İptal edilemedi" }
    }
}

// --- YARDIMCI: DURUMU OTOMATİK HESAPLA ---
async function updateInvoiceStatusBasedOnPayments(invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { items: true, payments: true }
    })

    if (!invoice) return

    // Toplam Tutar
    const totalAmount = invoice.items.reduce((acc, item) => {
        return acc + (Number(item.price) * item.quantity * (1 + item.vatRate / 100))
    }, 0)

    // Ödenen Tutar
    const paidAmount = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0)

    // Eğer ödenen >= toplam ise PAID, değilse PENDING
    let status: InvoiceStatus = "PENDING"
    if (paidAmount >= totalAmount - 0.1) { 
        status = "PAID"
    }

    await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status }
    })
}