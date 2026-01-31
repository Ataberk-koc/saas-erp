"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ExpenseCategory } from "@prisma/client" // 👈 Enum'ı import ettik

export async function addExpense(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  const description = formData.get("description") as string
  
  // 👇 Yeni Alanlar
  const category = formData.get("category") as ExpenseCategory || "OTHER"
  const dateStr = formData.get("date") as string
  const date = dateStr ? new Date(dateStr) : new Date()

  // Fiyatı Temizle (Mevcut mantığın korundu)
  let amountString = formData.get("amount") as string
  if (amountString.includes(".") && amountString.includes(",")) {
     amountString = amountString.replace(/\./g, "")
  } else if (amountString.includes(".") && !amountString.includes(",")) {
     amountString = amountString.replace(/\./g, "")
  }
  amountString = amountString.replace(",", ".")
  const amount = Number(amountString)

  try {
    await prisma.expense.create({
      data: {
        description,
        amount,
        category, // 👈 Veritabanına kategori eklendi
        date: date,     // 👈 Veritabanına tarih eklendi
        tenantId: user.tenantId
      }
    })

    // Dosya yoluna göre path'i güncelledim (expenses -> expense)
    revalidatePath("/dashboard/expense")
    revalidatePath("/dashboard") 
    return { success: true }
  } catch (error) {
    console.log(error)
    return { error: "Gider eklenirken hata oluştu." }
  }
}

export async function deleteExpense(id: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }
  
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })

  try {
    await prisma.expense.delete({
      where: { id: id, tenantId: user?.tenantId }
    })
    
    // Dosya yoluna göre path'i güncelledim
    revalidatePath("/dashboard/expense")
    revalidatePath("/dashboard")
    return { success: true }
  } catch {
    return { error: "Silinirken hata oluştu." }
  }
}