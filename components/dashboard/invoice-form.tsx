"use client"

import { useState } from "react"
import { createInvoice, updateInvoice } from "@/app/actions/invoice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Wallet } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

// --- TİP TANIMLAMALARI (Type-Safety İçin) ---
interface Customer {
  id: string
  name: string
  // Diğer alanlar opsiyonel olabilir
  [key: string]: unknown
}

interface Product {
  id: string
  name: string
  price: number | object // Prisma Decimal bazen obje gelebilir
  buyPrice: number | object
  vatRate: number
  stock?: number
}

interface InvoiceItem {
  productId: string
  quantity: number | string
  price: number | string
  vatRate: number | string
}

interface Payment {
  amount: number | string
  date: string
  note: string
}

interface InitialData {
  id: string
  customerId: string
  date: Date | string
  type: "SALES" | "PURCHASE"
  items: InvoiceItem[]
  payments?: Payment[]
}

interface Props {
  customers: Customer[]
  products: Product[]
  initialData?: InitialData
}

export function InvoiceForm({ customers, products, initialData }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Fatura Tipi (Varsayılan SALES, URL'den PURCHASE gelebilir)
  const type = initialData?.type || (searchParams.get("type") === "PURCHASE" ? "PURCHASE" : "SALES")
  
  // --- STATE ---
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || [
    { productId: "", quantity: 1, price: 0, vatRate: 20 }
  ])

  // Ödemeler State'i
  const [payments, setPayments] = useState<Payment[]>(
    initialData?.payments?.map((p) => ({
        amount: Number(p.amount),
        date: new Date(p.date).toISOString().split('T')[0],
        note: p.note || ""
    })) || []
  )

  // --- HESAPLAMALAR ---
  const calculateTotal = () => {
    return items.reduce((acc, item) => {
      const price = Number(item.price) || 0
      const qty = Number(item.quantity) || 1
      const vat = Number(item.vatRate) || 0
      return acc + (price * qty * (1 + vat / 100))
    }, 0)
  }

  const calculatePaid = () => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0)
  }

  const totalAmount = calculateTotal()
  const paidAmount = calculatePaid()
  const remainingAmount = totalAmount - paidAmount

  // --- ACTIONS ---

  // Hızlı Butonlar
  const handleMarkAsPaid = () => {
    if (remainingAmount <= 0) {
        toast.info("Zaten ödendi!")
        return
    }
    setPayments([...payments, { 
        amount: remainingAmount, 
        date: new Date().toISOString().split('T')[0],
        note: "Tamamı ödendi" 
    }])
  }

  const handleClearPayments = () => {
    if (confirm("Tüm ödeme kayıtları silinecek. Emin misin?")) {
        setPayments([])
    }
  }

  // Kaydetme
  async function handleSubmit(formData: FormData) {
    formData.set("type", type)

    const cleanItems = items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        price: Number(i.price),
        vatRate: Number(i.vatRate)
    }))

    // Ödemeleri de gönderiyoruz
    const cleanPayments = payments.map(p => ({
        amount: Number(p.amount),
        date: p.date,
        note: p.note
    }))

    let res;
    if (initialData?.id) {
        // GÜNCELLEME MODU
        res = await updateInvoice(initialData.id, formData, cleanItems, cleanPayments)
    } else {
        // OLUŞTURMA MODU
        res = await createInvoice(formData, cleanItems, cleanPayments)
    }

    if (res?.error) {
        toast.error(res.error)
    } else {
        toast.success("İşlem Başarılı!")
        router.push("/dashboard/invoices")
        router.refresh()
    }
  }

  // --- YARDIMCI FONKSİYONLAR ---
  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    
    setItems((prev) => {
        const newItems = [...prev]
        if (product) {
            let priceToUse = 0
            
            // Decimal tipinden Number'a güvenli dönüşüm (Eğer edit sayfasından number geliyorsa sorun yok)
            const buyPriceVal = typeof product.buyPrice === 'object' ? Number(product.buyPrice) : product.buyPrice
            const priceVal = typeof product.price === 'object' ? Number(product.price) : product.price

            if (type === 'PURCHASE') priceToUse = Number(buyPriceVal) || 0 
            else priceToUse = Number(priceVal) || 0
            
            newItems[index] = { 
                ...newItems[index], 
                productId, 
                price: priceToUse, 
                vatRate: product.vatRate || 20 
            }
        }
        return newItems
    })
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
        const newItems = [...prev]
        newItems[index] = {
            ...newItems[index],
            [field]: value
        }
        return newItems
    })
  }

  const updatePayment = (index: number, field: keyof Payment, value: string | number) => {
      setPayments((prev) => {
          const newPayments = [...prev]
          newPayments[index] = {
              ...newPayments[index],
              [field]: value
          }
          return newPayments
      })
  }

  // --- RENDER ---
  return (
    <form action={handleSubmit} className="space-y-6">
      
      {/* BAŞLIK & CARİ SEÇİMİ */}
      <Card className={`border-t-4 ${type === 'PURCHASE' ? 'border-t-red-500' : 'border-t-blue-500'}`}>
        <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{type === 'PURCHASE' ? 'Alış Faturası' : 'Satış Faturası'}</CardTitle>
            <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleClearPayments} className="text-red-600">
                    Ödenmedi / Sıfırla
                </Button>
                <Button type="button" variant="default" size="sm" onClick={handleMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700">
                    Tamamı Ödendi
                </Button>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label className="text-sm font-medium text-slate-500">Cari Hesap</label>
                <select 
                    name="customerId" 
                    defaultValue={initialData?.customerId} 
                    className="flex h-10 w-full rounded-md border border-input px-3 bg-background" 
                    required
                >
                    <option value="">Seçiniz...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-slate-500">Tarih</label>
                <Input 
                    name="date" 
                    type="date" 
                    defaultValue={initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                />
            </div>
        </CardContent>
      </Card>

      {/* ÜRÜN LİSTESİ */}
      <Card>
        <CardContent className="p-0">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="p-3 pl-6">Ürün</th>
                        <th className="p-3 w-24">Miktar</th>
                        <th className="p-3 w-32">Birim Fiyat</th>
                        <th className="p-3 w-20">KDV</th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items.map((item, index) => (
                        <tr key={index}>
                            <td className="p-3 pl-6">
                                <select 
                                    value={item.productId}
                                    onChange={(e) => handleProductChange(index, e.target.value)}
                                    className="flex h-9 w-full rounded-md border bg-transparent px-3"
                                    required
                                >
                                    <option value="">Seç...</option>
                                    {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </td>
                            <td className="p-3"><Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} /></td>
                            <td className="p-3"><Input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} /></td>
                            <td className="p-3"><Input type="number" value={item.vatRate} onChange={(e) => updateItem(index, 'vatRate', e.target.value)} /></td>
                            <td className="p-3">
                                <Button type="button" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                                    <Trash2 size={16}/>
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="p-4 bg-slate-50 border-t">
                <Button type="button" variant="outline" onClick={() => setItems([...items, { productId: "", quantity: 1, price: 0, vatRate: 20 }])}>
                    <Plus size={16}/> Yeni Satır
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* --- ÖDEME VE BAKİYE BÖLÜMÜ --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Sol Taraf: Ödeme Geçmişi */}
          <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-slate-500"/> Tahsilat / Ödeme Hareketleri
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                      {payments.map((p, idx) => (
                          <div key={idx} className="flex gap-2 items-end border-b pb-2 last:border-0">
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400">Tarih</label>
                                  <Input 
                                    type="date" 
                                    value={p.date} 
                                    onChange={(e) => updatePayment(idx, 'date', e.target.value)} 
                                    className="h-8"
                                  />
                              </div>
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400">Tutar</label>
                                  <Input 
                                    type="number" 
                                    value={p.amount} 
                                    onChange={(e) => updatePayment(idx, 'amount', e.target.value)} 
                                    className="h-8 font-bold"
                                  />
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="h-8 w-8 text-red-500">
                                  <Trash2 size={14}/>
                              </Button>
                          </div>
                      ))}
                      
                      <Button type="button" variant="outline" size="sm" className="w-full border-dashed" 
                          onClick={() => setPayments([...payments, { amount: 0, date: new Date().toISOString().split('T')[0], note: "" }])}>
                          <Plus size={14} className="mr-2"/> Ödeme Ekle
                      </Button>
                  </div>
              </CardContent>
          </Card>

          {/* Sağ Taraf: Bakiye Özeti */}
          <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Genel Tutar</span>
                      <span className="font-bold text-lg">{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                      <span>Ödenen Tutar</span>
                      <span className="font-bold">(-) {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(paidAmount)}</span>
                  </div>
                  <div className="h-px bg-slate-300 my-2"></div>
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">KALAN TUTAR</span>
                      <span className={`text-2xl font-black ${remainingAmount > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(remainingAmount)}
                      </span>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="flex justify-end pt-4">
          <Button type="submit" size="lg" className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
              {initialData ? 'Değişiklikleri Kaydet' : 'Faturayı Oluştur'}
          </Button>
      </div>
    </form>
  )
}