"use server"

import { auth } from "@/auth"
import { iyzipay } from "@/lib/iyzipay"
import { prisma } from "@/lib/db"

// Bu URL'i canlıya geçince değiştireceğiz (şimdilik localhost)
const BASE_URL = process.env.NODE_ENV === "production" 
  ? "https://ata-erp.vercel.app" 
  : "http://localhost:3000"

export async function startSubscription() {
  const session = await auth()
  if (!session?.user?.email) return { error: "Giriş yapmalısınız" }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  })

  if (!user) return { error: "Kullanıcı bulunamadı" }

  // Iyzico İsteği Hazırlama
  const request = {
    locale: "tr",
    conversationId: user.tenantId, // Geri döndüğünde hangi şirket olduğunu bilelim
    price: "299.00",
    paidPrice: "299.00",
    currency: "TRY",
    basketId: `PLAN-PRO-${user.tenantId}`,
    paymentGroup: "PRODUCT",
    callbackUrl: `${BASE_URL}/dashboard/payment/result`, // Ödeme bitince buraya dönecek
    
    buyer: {
      id: user.id,
      name: user.name || "Kullanıcı",
      surname: "Müşteri",
      gsmNumber: "+905555555555", // Zorunlu alan (Dummy)
      email: user.email,
      identityNumber: "11111111111", // Zorunlu alan (Dummy)
      lastLoginDate: "2024-01-01 12:00:00",
      registrationAddress: "Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1",
      ip: "85.34.78.112", // Gerçek IP almak Next.js'de biraz uzun, şimdilik dummy
      city: "Istanbul",
      country: "Turkey",
      zipCode: "34732",
    },
    billingAddress: {
      contactName: user.name || "Kullanıcı",
      city: "Istanbul",
      country: "Turkey",
      address: "Nidakule Göztepe, Merdivenköy Mah. Bora Sok. No:1",
      zipCode: "34732",
    },
    basketItems: [
      {
        id: "PRO_PLAN",
        name: "ATA ERP - Pro Paket",
        category1: "Yazılım",
        itemType: "VIRTUAL", // Kargo yok, dijital ürün
        price: "299.00",
      },
    ],
  }

  return new Promise((resolve) => {
    // 👇 BURASI DEĞİŞTİ: err ve result yanına ": any" ekledik
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    iyzipay.checkoutFormInitialize.create(request, (err: any, result: any) => {
      if (err) {
        resolve({ error: "Iyzico Hatası: " + err })
      } else if (result.status === "failure") {
        resolve({ error: "Ödeme Başlatılamadı: " + result.errorMessage })
      } else {
        resolve({ success: true, htmlContent: result.checkoutFormContent })
      }
    })
  })
}