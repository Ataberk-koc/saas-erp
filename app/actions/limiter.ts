"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { PLAN_LIMITS } from "@/lib/constants"

export async function checkLimit(feature: "invoices" | "customers") {
  const session = await auth()
  if (!session?.user?.email) return false

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  })

  if (!user?.tenant) return false

  const plan = user.tenant.plan // FREE, PRO vs.
  const limits = PLAN_LIMITS[plan] // Kuralları getir

  // 👇 DÜZELTME: Gelen isteğe göre doğru limiti seçiyoruz
  // "invoices" geldiyse "maxInvoices", "customers" geldiyse "maxCustomers" değerini al.
  const limitValue = feature === "invoices" ? limits.maxInvoices : limits.maxCustomers

  // 1. Eğer sınırsız ise direkt geç
  if (limitValue > 100000) return true

  // 2. Mevcut sayıyı bul
  let count = 0
  
  if (feature === "invoices") {
    count = await prisma.invoice.count({ where: { tenantId: user.tenantId } })
  } else if (feature === "customers") {
    count = await prisma.customer.count({ where: { tenantId: user.tenantId } })
  }

  // 3. Kontrol et: Mevcut sayı < Limit mi?
  if (count < limitValue) {
    return true // Devam et, sorun yok
  } else {
    return false // DUR! Limit doldu.
  }
}

// AI veya WhatsApp gibi özellikler için sadece Evet/Hayır kontrolü
export async function checkFeature(feature: "canUseAI" | "canUseWhatsapp") {
    const session = await auth()
    if (!session?.user?.email) return false
  
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { tenant: true }
    })
  
    if (!user?.tenant) return false
    
    const plan = user.tenant.plan
    return PLAN_LIMITS[plan][feature]
}