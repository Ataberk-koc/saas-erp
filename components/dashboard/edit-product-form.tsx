"use client"

import { useState } from "react"
import { updateProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2 } from "lucide-react"

interface EditProductFormProps {
  product: {
    id: string
    name: string
    price: number | string
    stock: number
    vatRate: number
  }
}

export function EditProductForm({ product }: EditProductFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    
    // Server Action çağırıyoruz
    const result = await updateProduct(product.id, formData) as { error?: string }

    if (result?.error) {
      toast.error(result.error)
      setLoading(false) // Hata varsa yüklemeyi durdur
    } else {
      toast.success("Ürün başarıyla güncellendi!")
      // Yönlendirme işlemi action içinde (redirect) yapıldığı için burada bekliyoruz
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      
      <div className="grid gap-2">
        <label className="text-sm font-medium">Ürün Adı</label>
        <Input name="name" defaultValue={product.name} required />
      </div>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="grid w-full gap-2">
          <label className="text-sm font-medium">Fiyat (TL)</label>
          <Input 
            name="price" 
            type="text" 
            defaultValue={product.price.toString()} 
            required 
          />
        </div>

        <div className="grid w-full gap-2">
          <label className="text-sm font-medium">Stok</label>
          <Input name="stock" type="number" defaultValue={product.stock} required />
        </div>
      </div>

      <div className="grid w-full gap-2">
        <label className="text-sm font-medium">KDV Oranı (%)</label>
        <select 
          name="vatRate" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          defaultValue={product.vatRate}
        >
          <option value="0">%0</option>
          <option value="1">%1</option>
          <option value="8">%8</option>
          <option value="10">%10</option>
          <option value="18">%18</option>
          <option value="20">%20</option>
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Link href="/dashboard/products">
          <Button variant="outline" type="button" disabled={loading}>İptal</Button>
        </Link>
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
        </Button>
      </div>

    </form>
  )
}