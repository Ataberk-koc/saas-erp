"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInvoiceEmail(invoiceId: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email }, include: { tenant: true } })
  
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, tenantId: user?.tenantId },
    include: { customer: true, items: { include: { product: true } } }
  })

  if (!invoice || !invoice.customer.email) return { error: "Fatura veya müşteri emaili bulunamadı." }

  // Toplam Tutar Hesapla
  const totalAmount = invoice.items.reduce((acc, item) => {
     const lineTotal = Number(item.price) * item.quantity
     const vat = lineTotal * (item.vatRate / 100)
     return acc + lineTotal + vat
  }, 0)

  try {
    // E-Posta Gönder
    await resend.emails.send({
      from: "ATA Yazılım <fatura@resend.dev>", // Burayı kendi onaylı domainin yapmalısın
      to: invoice.customer.email,
      subject: `Fatura #${invoice.number} - ${user?.tenant?.name}`,
      html: `
        <h1>Sayın ${invoice.customer.name},</h1>
        <p>${user?.tenant?.name} tarafından kesilen faturanız ektedir.</p>
        
        <div style="border:1px solid #ddd; padding:20px; border-radius:8px; margin:20px 0;">
            <h3>Fatura Özeti</h3>
            <p><strong>Fatura No:</strong> #${invoice.number}</p>
            <p><strong>Tarih:</strong> ${new Date(invoice.date).toLocaleDateString("tr-TR")}</p>
            <p><strong>Toplam Tutar:</strong> <span style="color:green; font-weight:bold;">${new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(totalAmount)}</span></p>
        </div>

        <p>Detaylı faturanızı görüntülemek ve indirmek için aşağıdaki butona tıklayın:</p>
        <a href="http://localhost:3000/dashboard/invoices/${invoice.id}" style="background-color:#2563eb; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; display:inline-block;">
            Faturayı Görüntüle
        </a>
      `
      // Not: PDF attachment işi Vercel hoby planında time-out'a düşebilir, en sağlıklısı link vermektir.
    })

    return { success: "Fatura müşteriye gönderildi! 📨" }

  } catch {
    return { error: "Mail gönderilemedi." }
  }
}