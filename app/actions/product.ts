"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation" // 👈 Bu satır eklendi

// 1. ÜRÜN EKLEME (Mevcut kodun)
export async function addProduct(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  const name = formData.get("name") as string
  const stock = Number(formData.get("stock"))
  const vatRate = Number(formData.get("vatRate"))

  let priceString = formData.get("price") as string

  // Fiyat Temizleme Mantığı (Türkçe Format)
  if (priceString.includes(".") && priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  } else if (priceString.includes(".") && !priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  }

  priceString = priceString.replace(",", ".")
  const price = Number(priceString)
  
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

// 2. ÜRÜN SİLME (YENİ EKLENDİ)
export async function deleteProduct(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  try {
    await prisma.product.delete({
      where: { 
        id: id,
        tenantId: user.tenantId // Güvenlik: Sadece kendi ürününü silebilir
      }
    })

    revalidatePath("/dashboard/products")
    return { success: true }
  } catch{
    return { error: "Silinirken hata oluştu (Faturada kullanılıyor olabilir)." }
  }
}

// 3. ÜRÜN GÜNCELLEME (YENİ EKLENDİ)
export async function updateProduct(id: string, formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })

  const name = formData.get("name") as string
  const stock = Number(formData.get("stock"))
  const vatRate = Number(formData.get("vatRate"))

  // Aynı Fiyat Temizleme Mantığını Burada da Kullanıyoruz
  let priceString = formData.get("price") as string
  if (priceString.includes(".") && priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  } else if (priceString.includes(".") && !priceString.includes(",")) {
     priceString = priceString.replace(/\./g, "")
  }
  priceString = priceString.replace(",", ".")
  const price = Number(priceString)

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
    redirect("/dashboard/products") // İşlem bitince listeye dön
  } catch {
    return { error: "Güncellenirken hata oluştu." }
  }
}