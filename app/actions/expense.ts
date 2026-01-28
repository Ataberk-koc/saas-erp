"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"

export async function addExpense(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" }

  const description = formData.get("description") as string
  
  // Fiyatı Temizle (Türkçe formatı düzeltme)
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
        tenantId: user.tenantId
      }
    })

    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard") // Dashboard'daki kar hesabını etkiler
    return { success: true }
  } catch (error) {
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
    revalidatePath("/dashboard/expenses")
    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    return { error: "Silinirken hata oluştu." }
  }
}