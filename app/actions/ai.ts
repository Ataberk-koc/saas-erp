"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function generateAiReport() {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, report: ["⚠️ HATA: .env dosyasında API anahtarı yok!"] }
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  // Verileri çek...
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  try {
    const invoices = await prisma.invoice.findMany({
      where: { tenantId: user.tenantId, date: { gte: firstDayOfMonth } },
      include: { items: true, customer: true }
    })
    
    // Giderleri de çekelim ki analiz tam olsun
    const expenses = await prisma.expense.findMany({
      where: { tenantId: user.tenantId, date: { gte: firstDayOfMonth } }
    })

    // Stok verisi
    const products = await prisma.product.findMany({
      where: { tenantId: user.tenantId },
      select: { name: true, stock: true }
    })

    const financialData = {
        ownerName: user.name,
        month: now.toLocaleString('tr-TR', { month: 'long' }),
        invoices: invoices.map(inv => ({
            total: inv.items.reduce((s, i) => s + Number(i.price) * i.quantity, 0),
            status: inv.status,
            customer: inv.customer.name
        })),
        expenses: expenses.map(exp => ({ desc: exp.description, amount: Number(exp.amount) })),
        lowStock: products.filter(p => p.stock <= 5).map(p => ({ name: p.name, stock: p.stock }))
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    
    // 👇 EKRAN GÖRÜNTÜSÜNDEKİ GEÇERLİ MODELİ KULLANIYORUZ
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" })

    const prompt = `
      Sen profesyonel bir ERP asistanısın. Şu verileri analiz et ve patrona hitaben rapor yaz:
      ${JSON.stringify(financialData)}

      Kurallar:
      1. Türkçe, samimi ve profesyonel ol.
      2. Başlıklar kullan (Örn: **Finansal Durum**, **Stok Uyarısı**).
      3. Madde işaretleri kullan.
      4. Emojilerle süsle.
      5. Eğer ciro, giderden azsa uyar, çoksa tebrik et.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    const reportLines = text.split('\n').filter(line => line.trim() !== "")
    return { success: true, report: reportLines }

  } catch (error: unknown) {
    let errorMessage = "Bilinmeyen bir hata oluştu.";
    if (error instanceof Error) errorMessage = error.message;
    console.error("🔴 AI HATA:", errorMessage)
    
    return { 
        success: false, 
        report: ["⚠️ AI Servisi şu an yanıt veremiyor.", errorMessage] 
    }
  }
}