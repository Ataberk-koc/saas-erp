"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { sanitizeInput } from "@/lib/utils"

// --- 1. KATEGORİ İŞLEMLERİ ---

// Yeni Kategori Ekleme
export async function addCategory(formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) return { error: "Yetkisiz işlem" }

  const name = sanitizeInput(formData.get("name") as string)

  if (!name) return { error: "Kategori adı boş olamaz" }

  try {
    // Aynı isimde kategori var mı kontrol et
    const existing = await prisma.category.findFirst({
      where: { 
        name: { equals: name, mode: "insensitive" },
        tenantId: session.user.tenantId
      }
    })

    if (existing) return { error: "Bu kategori zaten var." }

    await prisma.category.create({
      data: {
        name: name,
        type: "EXPENSE",
        tenantId: session.user.tenantId
      }
    })

    revalidatePath("/dashboard/expense")
    return { success: "Kategori eklendi" }
  } catch  {
    return { error: "Kategori eklenirken hata oluştu" }
  }
}

// --- 2. GİDER İŞLEMLERİ ---

const ExpenseSchema = z.object({
  description: z.string().min(1, "Açıklama giriniz"),
  amount: z.coerce.number().min(0, "Tutar giriniz"),
  category: z.string().min(1, "Kategori seçiniz"), // Artık String
  date: z.coerce.date()
})

export async function addExpense(formData: FormData) {
  const session = await auth()
  if (!session?.user?.tenantId) return { error: "Yetkisiz işlem" }

  // Form verilerini object'e çevirip doğrula (XSS temizliği dahil)
  const rawData = {
    description: sanitizeInput(formData.get("description") as string),
    amount: formData.get("amount"),
    category: sanitizeInput(formData.get("category") as string),
    date: formData.get("date") || new Date()
  }

  const validated = ExpenseSchema.safeParse(rawData)
  if (!validated.success) return { error: "Form verileri geçersiz" }

  try {
    await prisma.expense.create({
      data: {
        ...validated.data,
        tenantId: session.user.tenantId
      }
    })

    revalidatePath("/dashboard/expense")
    return { success: "Gider kaydedildi" }
  } catch {
    return { error: "İşlem başarısız" }
  }
}

export async function deleteExpense(id: string) {
  const session = await auth()
  if (!session?.user?.tenantId) return { error: "Yetkisiz işlem" }

  try {
    await prisma.expense.delete({
      where: { id: id, tenantId: session.user.tenantId }
    })
    revalidatePath("/dashboard/expense")
    return { success: "Silindi" }
  } catch {
    return { error: "Silinemedi" }
  }
}