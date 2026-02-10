"use client"

import { useState } from "react"
import { updateProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { CurrencyInput } from "@/components/ui/currency-input"
import { containsXSS } from "@/lib/utils"

interface EditProductFormProps {
  product: {
    id: string
    name: string
    price: number | string
    stock: number
    vatRate: number
    unit?: string
    currency?: string
    exchangeRate?: number | string
  }
}

export function EditProductForm({ product }: EditProductFormProps) {
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    formData.set("id", product.id)

    // XSS ön kontrolü (client-side)
    const name = formData.get("name") as string
    if (containsXSS(name)) {
      toast.error("Ürün adında güvenlik riski oluşturan içerik tespit edildi!")
      setLoading(false)
      return
    }
    
    // Server Action çağırıyoruz
    const result = await updateProduct(formData) as { error?: string }

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
          <label className="text-sm font-medium">Fiyat (₺ TL)</label>
          <CurrencyInput 
            name="price" 
            defaultValue={product.price} 
            required 
          />
        </div>

        <div className="grid w-full gap-2">
          <label className="text-sm font-medium">Stok</label>
          <Input name="stock" type="number" defaultValue={product.stock} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Birim</Label>
        <Select name="unit" defaultValue={product.unit || "Adet"}>
          <SelectTrigger>
            <SelectValue placeholder="Birim Seç" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Adet">Adet</SelectItem>
            <SelectItem value="Metre">Metre</SelectItem>
            <SelectItem value="Kg">Kilogram (Kg)</SelectItem>
            <SelectItem value="Lt">Litre (Lt)</SelectItem>
            <SelectItem value="Koli">Koli</SelectItem>
            <SelectItem value="Saat">Saat (Hizmet)</SelectItem>
            <SelectItem value="Gün">Gün (Hizmet)</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="space-y-2 w-full">
          <Label htmlFor="currency">Para Birimi</Label>
          <Select name="currency" defaultValue={product.currency || "TRY"}>
            <SelectTrigger>
              <SelectValue placeholder="Para Birimi Seç" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TRY">₺ TRY</SelectItem>
              <SelectItem value="USD">$ USD</SelectItem>
              <SelectItem value="EUR">€ EUR</SelectItem>
              <SelectItem value="GBP">£ GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid w-full gap-2">
          <Label>Kur</Label>
          <Input
            name="exchangeRate"
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="1"
            defaultValue={product.exchangeRate?.toString() || "1"}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (
                !/[0-9.,]/.test(e.key) &&
                !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'].includes(e.key)
              ) {
                e.preventDefault()
              }
            }}
          />
        </div>
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