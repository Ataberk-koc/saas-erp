"use client"

import { useState } from "react"
import { deleteProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, Trash2 } from "lucide-react"

export function DeleteProductButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    // Basit bir onay penceresi
    if(!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;

    setLoading(true)
    
    // Server Action'ı çağır
    const result = await deleteProduct(id) 
    
    setLoading(false)

    if (result?.error) {
      // Hata varsa göster (Örn: "Yetkiniz yok!")
      toast.error(result.error)
    } else {
      toast.success("Ürün başarıyla silindi")
    }
  }

  return (
    <Button 
      variant="destructive" 
      size="sm" 
      className="h-8" 
      onClick={handleDelete}
      disabled={loading}
      type="button" // Form submit etmemesi için button tipi
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <>
          <Trash2 className="h-4 w-4 mr-1" /> Sil
        </>
      )}
    </Button>
  )
}