"use client"

import { useRef } from "react"
import { addProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { toast } from "sonner"
import { containsXSS } from "@/lib/utils"

export function AddProductForm() {
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSave(formData: FormData) {
    // XSS ön kontrolü (client-side)
    const name = formData.get("name") as string
    if (containsXSS(name)) {
      toast.error("Ürün adında güvenlik riski oluşturan içerik tespit edildi!")
      return
    }

    const result = await addProduct(formData) as { error?: string; success?: boolean }
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Ürün başarıyla eklendi!")
      formRef.current?.reset()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>📦 Yeni Ürün / Hizmet Ekle</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          action={handleSave}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="grid w-full gap-2">
            <label className="text-sm font-medium">Ürün Adı</label>
            <Input name="name" placeholder="Örn: Hosting Hizmeti" required />
          </div>

          <div className="grid w-full gap-2">
            <label className="text-sm font-medium">Fiyat</label>
            <CurrencyInput
              name="price"
              placeholder="1.000,00"
              required
            />
          </div>

          <div className="grid w-full gap-2">
            <label className="text-sm font-medium">Kur</label>
            <Input
              name="exchangeRate"
              type="number"
              step="0.0001"
              min="0.0001"
              placeholder="1"
              defaultValue="1"
              onKeyDown={(e) => {
                // Sadece sayı, nokta, virgül, backspace, tab, ok tuşları izin ver
                if (
                  !/[0-9.,]/.test(e.key) &&
                  !['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'Delete', 'Home', 'End'].includes(e.key)
                ) {
                  e.preventDefault()
                }
              }}
            />
          </div>

          <div className="grid w-full gap-2">
            <label className="text-sm font-medium">Stok</label>
            <Input name="stock" type="number" defaultValue="100" required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="unit">Birim</Label>
            <Select name="unit" defaultValue="Adet">
              <SelectTrigger>
                <SelectValue placeholder="Birim Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Adet">Adet</SelectItem>
                <SelectItem value="Metre">Metre</SelectItem>
                <SelectItem value="Kg">Kg</SelectItem>
                <SelectItem value="Lt">Litre</SelectItem>
                <SelectItem value="Koli">Koli</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid w-full gap-2">
            <label className="text-sm font-medium">KDV Oranı (%)</label>
            <select
              name="vatRate"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              defaultValue="20"
            >
              <option value="0">%0</option>
              <option value="1">%1</option>
              <option value="8">%8</option>
              <option value="10">%10</option>
              <option value="18">%18</option>
              <option value="20">%20</option>
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="currency">Para Birimi</Label>
            <Select name="currency" defaultValue="TRY">
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

          <Button type="submit" className="w-full md:w-auto">
            Ekle
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
