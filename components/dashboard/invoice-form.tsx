"use client"

import { useState } from "react"
import { createInvoice, updateInvoice } from "@/app/actions/invoice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Trash2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

// --- TİP TANIMLAMALARI ---
interface Customer {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  price: number
  vatRate: number
  buyPrice?: number | null // null gelebilme ihtimaline karşı
}

interface InitialData {
  id: string
  customerId: string
  date: Date
  items: {
    productId: string
    quantity: number
    price: number
    vatRate: number
  }[]
}

interface Props {
  customers: Customer[]
  products: Product[]
  initialData?: InitialData
}

interface InvoiceItem {
  productId: string
  quantity: number | string
  price: number | string
  vatRate: number | string
}

export function InvoiceForm({ customers, products, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isEditMode = !!initialData
  
  // URL'den fatura tipini al (Varsayılan: SATIŞ)
  // ?type=PURCHASE ise Alış Faturası moduna geçer
  const type = searchParams.get("type") === "PURCHASE" ? "PURCHASE" : "SALES"
  
  // State Başlangıcı
  const [items, setItems] = useState<InvoiceItem[]>(
    initialData
      ? initialData.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          vatRate: item.vatRate,
        }))
      : [{ productId: "", quantity: 1, price: 0, vatRate: 20 }]
  )

  // --- 1. ARA TOPLAM HESAPLAMA (Görünüm İçin) ---
  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const price = Number(item.price) || 0
      const qty = Number(item.quantity) || 1
      const vat = Number(item.vatRate) || 0 // Varsayılan 0 olsun, ürün seçince dolar
      
      const lineTotal = price * qty
      const taxAmount = lineTotal * (vat / 100)
      
      return acc + lineTotal + taxAmount
    }, 0)
  }

  // --- 2. FORM GÖNDERİMİ (SERVER ACTION) ---
  async function handleSubmit(formData: FormData) {
    // Fatura Tipini Elle Ekliyoruz (Garanti olsun)
    formData.set("type", type)
    
    // Verileri backend formatına çevir (String -> Number)
    const cleanItems = items.map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        price: Number(i.price), // Burası "Birim Fiyat"tır (KDV Hariç)
        vatRate: Number(i.vatRate)
    }))

    // Server Action'ı çağır
    const res = isEditMode
      ? await updateInvoice(initialData.id, formData, cleanItems)
      : await createInvoice(formData, cleanItems)

    if (res?.error) {
        toast.error(res.error)
    } else {
        toast.success(isEditMode ? "✅ Fatura güncellendi!" : (type === 'SALES' ? "✅ Satış faturası kesildi!" : "✅ Alış faturası işlendi!"))
        router.push("/dashboard/invoices") // Listeye yönlendir
        router.refresh() // Verileri yenile
    }
  }

  // --- 3. ÜRÜN SEÇİLİNCE FİYAT GETİR ---
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId)
    
    // Güvenli State Güncellemesi
    setItems(prevItems => {
        const newItems = [...prevItems]
        const updatedItem = { ...newItems[index], productId }

        if (product) {
            // Eğer ALIŞ faturası kesiyorsak:
            // Varsa 'Alış Fiyatı'nı getir, yoksa '0' getir (Satış fiyatını getirme!)
            // Böylece kullanıcı maliyeti kendi girsin.
            
            let priceToUse = 0;
            
            if (type === 'PURCHASE') {
                 priceToUse = Number(product.buyPrice) || 0;
            } else {
                 // Satış faturasıysa normal satış fiyatını getir
                 priceToUse = Number(product.price);
            }
            
            updatedItem.price = priceToUse
            updatedItem.vatRate = product.vatRate || 20
        }

        newItems[index] = updatedItem
        return newItems
    })
  }

  // --- 4. SATIR GÜNCELLEME ---
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems(prevItems => {
        const newItems = [...prevItems]
        newItems[index] = {
            ...newItems[index],
            [field]: value
        }
        return newItems
    })
  }

  // --- 5. SATIR EKLE / SİL ---
  const addItem = () => setItems([...items, { productId: "", quantity: 1, price: 0, vatRate: 20 }])
  
  const removeItem = (index: number) => {
    setItems(prevItems => prevItems.filter((_, i) => i !== index))
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      
      {/* BAŞLIK KARTI */}
      <Card className={`border-t-4 ${type === 'PURCHASE' ? 'border-t-red-500' : 'border-t-blue-500'}`}>
        <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-sm font-medium text-slate-500">
                    {type === 'PURCHASE' ? 'Tedarikçi Seçimi' : 'Müşteri Seçimi'}
                </label>
                <select name="customerId" defaultValue={initialData?.customerId || ""} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" required>
                    <option value="">Seçiniz...</option>
                    {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-500">Fatura Tarihi</label>
                <Input name="date" type="date" defaultValue={initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
            </div>
        </CardContent>
      </Card>

      {/* ÜRÜN LİSTESİ */}
      <Card>
        <CardContent className="p-0">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="p-3 pl-6">Ürün / Hizmet</th>
                        <th className="p-3 w-24">Miktar</th>
                        <th className="p-3 w-32">Birim Fiyat</th>
                        <th className="p-3 w-20">KDV %</th>
                        <th className="p-3 w-32 text-right">Toplam</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items.map((item, index) => {
                        const lineTotal = (Number(item.price) * Number(item.quantity)) * (1 + (Number(item.vatRate)/100))
                        
                        return (
                            <tr key={index}>
                                <td className="p-3 pl-6">
                                    <select 
                                        value={item.productId}
                                        onChange={(e) => handleProductChange(index, e.target.value)}
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                                        required
                                    >
                                        <option value="">Ürün Seç...</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-3">
                                    <Input 
                                        type="number" 
                                        min="1" 
                                        value={item.quantity} 
                                        onChange={(e) => updateItem(index, 'quantity', e.target.value)} 
                                    />
                                </td>
                                <td className="p-3">
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        value={item.price} 
                                        onChange={(e) => updateItem(index, 'price', e.target.value)} 
                                        placeholder="0.00"
                                    />
                                </td>
                                <td className="p-3">
                                    <Input 
                                        type="number" 
                                        value={item.vatRate} 
                                        onChange={(e) => updateItem(index, 'vatRate', e.target.value)} 
                                    />
                                </td>
                                <td className="p-3 text-right font-medium">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(lineTotal)}
                                </td>
                                <td className="p-3">
                                    <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                                        <Trash2 size={16} />
                                    </Button>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
            
            <div className="p-4 bg-slate-50 flex justify-between items-center border-t">
                <Button type="button" variant="outline" onClick={addItem} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                    <Plus size={16} className="mr-2" /> Yeni Satır
                </Button>
                
                <div className="text-right">
                    <span className="text-slate-500 text-sm mr-4">Genel Toplam (KDV Dahil):</span>
                    <span className="text-2xl font-bold text-slate-800">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(calculateTotal())}
                    </span>
                </div>
            </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
          <Button type="submit" size="lg" className={`w-full md:w-auto ${type === 'PURCHASE' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {isEditMode ? 'Faturayı Güncelle' : (type === 'PURCHASE' ? 'Alış Faturasını Kaydet' : 'Satış Faturasını Onayla')}
          </Button>
      </div>

    </form>
  )
}