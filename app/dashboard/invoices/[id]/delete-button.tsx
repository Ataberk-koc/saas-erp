"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { deleteInvoice } from "@/app/actions/invoice"
import { useRouter } from "next/navigation"

export default function DeleteButton({ invoiceId }: { invoiceId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteInvoice(invoiceId)
      
      if (result.success) {
        // Başarılı silme mesajı göster
        showSuccessToast("Fatura başarıyla silindi!")
        
        // 2 saniye sonra listeye yönlendir
        setTimeout(() => {
          router.push("/dashboard/invoices")
        }, 2000)
      } else {
        showErrorToast(result.error || "Silme işlemi başarısız oldu!")
        setShowConfirm(false)
      }
    } catch (error) {
      showErrorToast("Bir hata oluştu!")
      setShowConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (showConfirm) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm mx-4">
          <h2 className="text-xl font-bold text-slate-900 mb-4">
            Faturayı silmek istediğinize emin misiniz?
          </h2>
          <p className="text-slate-600 mb-6">
            Bu işlem geri alınamaz. Fatura ve tüm kalemleri silinecektir.
          </p>
          
          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={isDeleting}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Siliniyor..." : "Evet, Sil"}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Button
      variant="destructive"
      onClick={() => setShowConfirm(true)}
      className="ml-2"
    >
      🗑️ Sil
    </Button>
  )
}

// Toast gösterme fonksiyonları
function showSuccessToast(message: string) {
  const toast = document.createElement("div")
  toast.className = "fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in-50"
  toast.textContent = message
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 3000)
}

function showErrorToast(message: string) {
  const toast = document.createElement("div")
  toast.className = "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-in fade-in-50"
  toast.textContent = message
  document.body.appendChild(toast)
  
  setTimeout(() => {
    toast.remove()
  }, 3000)
}
