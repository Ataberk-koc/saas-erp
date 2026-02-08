"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/db"

export async function getProductReport(productId: string) {
  const session = await auth()
  if (!session?.user?.email) return { error: "Yetkisiz işlem" }

  if (!productId) return { error: "Ürün seçilmedi" }

  try {
    // 1. Ürün Bilgisini Çek
    const product = await prisma.product.findUnique({
      where: { id: productId }
    })

    if (!product) return { error: "Ürün bulunamadı" }

    // 2. Bu ürüne ait tüm fatura hareketlerini çek (Alış ve Satış)
    const movements = await prisma.invoiceItem.findMany({
      where: { productId },
      include: {
        invoice: {
          include: {
            customer: true // Kimden alındı / Kime satıldı
          }
        }
      },
      orderBy: {
        invoice: { date: 'desc' } // En yeni en üstte
      }
    })

    // 3. Hesaplamalar
    let totalBoughtQty = 0
    let totalBoughtAmount = 0
    let totalSoldQty = 0
    let totalSoldAmount = 0

    const history = movements.map(m => {
      const isPurchase = m.invoice.type === "PURCHASE"
      const total = Number(m.price) * m.quantity

      if (isPurchase) {
        totalBoughtQty += m.quantity
        totalBoughtAmount += total
      } else {
        totalSoldQty += m.quantity
        totalSoldAmount += total
      }

      return {
        id: m.id,
        date: m.invoice.date,
        type: m.invoice.type,
        customerName: m.invoice.customer?.name || "Bilinmiyor",
        quantity: m.quantity,
        unitPrice: Number(m.price),
        totalPrice: total
      }
    })

    // Ortalama Alış Maliyeti (Ağırlıklı Ortalama)
    const averageCost = totalBoughtQty > 0 ? (totalBoughtAmount / totalBoughtQty) : Number(product.buyPrice)

    // Tahmini Kâr Hesabı: (Satılanların Toplam Geliri) - (Satılan Adet * Ortalama Maliyet)
    const costOfGoodsSold = totalSoldQty * averageCost
    const estimatedProfit = totalSoldAmount - costOfGoodsSold

    // 4. Stok Geçmişi (InventoryLog)
    const stockLogs = await prisma.inventoryLog.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const stockHistory = stockLogs.map(log => ({
      id: log.id,
      date: log.createdAt,
      change: log.change,
      newStock: log.newStock,
      type: log.type,
      note: log.note,
    }))

    return {
      productName: product.name,
      currentStock: product.stock,
      averageCost,
      totalSoldQty,
      totalSoldAmount,
      totalBoughtQty,
      totalBoughtAmount,
      estimatedProfit,
      history,
      stockHistory,
    }

  } catch (error) {
    console.error("Rapor hatası:", error)
    return { error: "Rapor oluşturulamadı" }
  }
}