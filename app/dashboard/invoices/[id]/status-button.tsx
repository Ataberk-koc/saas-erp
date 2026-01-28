// app/dashboard/invoices/[id]/status-buttons.tsx
"use client"

import { updateInvoiceStatus } from "@/app/actions/invoice"
import { Button } from "@/components/ui/button"
import { InvoiceStatus } from "@prisma/client" // Prisma'dan gelen tipler
import { useState } from "react"

export default function StatusButtons({ id, currentStatus }: { id: string, currentStatus: string }) {
  const [loading, setLoading] = useState(false)
  
  // Durum Değiştirme Fonksiyonu
  async function handleStatusChange(status: InvoiceStatus) {
    setLoading(true)
    await updateInvoiceStatus(id, status)
    setLoading(false)
    // Sayfa otomatik yenilenir (Action içinde revalidatePath var)
  }

  return (
    <div className="flex items-center gap-2 no-print">
      {/* Eğer zaten ÖDENDİ ise bu butonu gösterme */}
      {currentStatus !== "PAID" && (
        <Button 
            onClick={() => handleStatusChange("PAID")} 
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
        >
          ✅ Ödendi Yap
        </Button>
      )}

      {/* Eğer zaten BEKLİYOR ise gösterme */}
      {currentStatus !== "PENDING" && currentStatus !== "PAID" && (
         <Button 
            onClick={() => handleStatusChange("PENDING")} 
            disabled={loading}
            variant="outline"
         >
           ⏳ Bekliyor Yap
         </Button>
      )}

      {/* İptal Butonu (Sadece iptal değilse göster) */}
      {currentStatus !== "CANCELLED" && (
        <Button 
            onClick={() => handleStatusChange("CANCELLED")} 
            disabled={loading}
            variant="destructive"
        >
          🚫 İptal Et
        </Button>
      )}
    </div>
  )
}