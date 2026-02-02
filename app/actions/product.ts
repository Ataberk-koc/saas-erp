"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { productSchema } from "@/lib/schemas" // 👈 Şemayı import ettik

// Fiyat temizleme yardımcısı (Türkçe formatı düzeltir: 1.000,50 -> 1000.50)
function cleanPrice(priceString: string) {
  if (!priceString) return "0"
  
  // 1. Noktaları (binlik ayırıcı) temizle
  if (priceString.includes(".") && priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  } else if (priceString.includes(".") && !priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  }
  
  // 2. Virgülü noktaya çevir (kuruş ayırıcı)
  return priceString.replace(",", ".")
}

// 1. ÜRÜN EKLEME
export async function addProduct(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  // A. Veriyi Hazırla (Fiyatı temizleyerek)
  const rawData = {
    name: formData.get("name"),
    price: cleanPrice(formData.get("price") as string),
    stock: formData.get("stock"),
    vatRate: formData.get("vatRate"),
  }

  // B. Zod Validasyonu 🛡️
  const validation = productSchema.safeParse(rawData)

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { name, price, stock, vatRate } = validation.data

  try {
    await prisma.product.create({
      data: {
        name,
        price,
        stock,
        vatRate,
        tenantId: user.tenantId,
      },
    })

    revalidatePath("/dashboard/products")
    return { success: true }
  } catch {
    return { error: "Ürün eklenirken hata oluştu." }
  }
}

// 2. ÜRÜN SİLME
export async function deleteProduct(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  // 👇 GÜVENLİK: Sadece Admin silebilir
  if (session.user.role !== "ADMIN") {
    return { error: "Ürün silme yetkiniz yok! Sadece Yönetici silebilir." }
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    await prisma.product.delete({
      where: { 
        id: id,
        tenantId: user.tenantId 
      }
    })

    revalidatePath("/dashboard/products")
    return { success: true }
  } catch{
    return { error: "Silinirken hata oluştu (Faturada kullanılıyor olabilir)." }
  }
}

// 3. ÜRÜN GÜNCELLEME
export async function updateProduct(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  // Not: Güncelleme işlemini Muhasebeci de yapabilir, o yüzden Admin kontrolü koymadık.
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })

  // A. Veriyi Hazırla
  const rawData = {
    name: formData.get("name"),
    price: cleanPrice(formData.get("price") as string),
    stock: formData.get("stock"),
    vatRate: formData.get("vatRate"),
  }

  // B. Zod Validasyonu
  const validation = productSchema.safeParse(rawData)

  if (!validation.success) {
    return { error: validation.error.issues[0].message }
  }

  const { name, price, stock, vatRate } = validation.data

  try {
    await prisma.product.update({
      where: { 
        id: id,
        tenantId: user?.tenantId 
      },
      data: {
        name,
        price,
        stock,
        vatRate
      }
    })

    revalidatePath("/dashboard/products")
    redirect("/dashboard/products") 
  } catch {
    return { error: "Güncellenirken hata oluştu." }
  }
}