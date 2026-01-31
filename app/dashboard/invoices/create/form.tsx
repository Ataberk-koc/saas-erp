// app/dashboard/invoices/create/form.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createInvoice } from "@/app/actions/invoice"

type Props = {
  customers: { id: string; name: string }[]
  products: { id: string; name: string; price: number; vatRate: number }[]
}

export default function CreateInvoiceForm({ customers, products }: Props) {
  const [selectedVat, setSelectedVat] = useState(20)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Ürün değişince KDV'yi güncelle
  function handleProductChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const productId = e.target.value
    const product = products.find((p) => p.id === productId)
    
    if (product) {
      setSelectedVat(product.vatRate)
    }
  }

  async function handleAction(formData: FormData) {
    setIsLoading(true)
    setMessage(null)
    
    // 👇 DÜZELTME: 'any' yerine beklediğimiz tipi belirttik
    // Bu sayede hem TypeScript hem de ESLint mutlu olur.
    const result = await createInvoice(formData) as { error?: string }
    
    // Hata yoksa başarılı sayıyoruz
    if (!result?.error) {
      setMessage({ type: 'success', text: '✅ Fatura başarıyla oluşturuldu! Yönlendiriliyorsunuz...' })
      
      const form = document.querySelector('form') as HTMLFormElement
      if (form) form.reset()
      setSelectedVat(20)
      
      setTimeout(() => setMessage(null), 3000)
    } else {
      setMessage({ type: 'error', text: `❌ ${result.error || 'Bir hata oluştu'}` })
    }
    
    setIsLoading(false)
  }

  return (
    <>
      {message && (
        <div className={`p-4 rounded-md mb-4 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-800 border border-green-300' 
            : 'bg-red-100 text-red-800 border border-red-300'
        }`}>
          {message.text}
        </div>
      )}
      
      <form action={handleAction} className="space-y-6">
        
        <div className="grid gap-2">
          <label className="font-medium">Müşteri Seç</label>
          <select name="customerId" className="border rounded p-2 bg-white h-10" required>
            <option value="">Seçiniz...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          
          {/* Ürün Seçimi */}
          <div className="grid gap-2 w-full md:w-1/2">
            <label className="font-medium">Ürün / Hizmet</label>
            <select 
              name="productId" 
              className="border rounded p-2 bg-white h-10" 
              required
              onChange={handleProductChange} 
            >
              <option value="">Seçiniz...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.price} TL) - Varsayılan: %{p.vatRate}
                </option>
              ))}
            </select>
          </div>

          {/* Adet */}
          <div className="grid gap-2 w-full md:w-1/4">
            <label className="font-medium">Adet</label>
            <Input name="quantity" type="number" defaultValue="1" min="1" required />
          </div>

          {/* KDV Seçimi */}
          <div className="grid gap-2 w-full md:w-1/4">
            <label className="font-medium">KDV (%)</label>
            <select 
              name="vatRate" 
              className="border rounded p-2 bg-white h-10"
              value={selectedVat}
              onChange={(e) => setSelectedVat(Number(e.target.value))}
            >
              <option value="0">%0</option>
              <option value="1">%1</option>
              <option value="8">%8</option>
              <option value="10">%10</option>
              <option value="18">%18</option>
              <option value="20">%20</option>
            </select>
          </div>

        </div>

        <div className="grid gap-2">
          <label className="font-medium">Son Ödeme Tarihi</label>
          <Input name="dueDate" type="date" required />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Oluşturuluyor...' : 'Faturayı Oluştur'}
        </Button>
      </form>
    </>
  )
}