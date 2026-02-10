"use client"

import { useState } from "react"
import { createInvoice, updateInvoice } from "@/app/actions/invoice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Wallet, Calculator, RefreshCcw, CheckCircle2 } from "lucide-react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"

// --- TİP TANIMLAMALARI ---
interface Customer {
  id: string
  name: string
  [key: string]: unknown
}

interface Product {
  id: string
  name: string
  price: number | object
  buyPrice: number | object
  vatRate: number
  stock?: number
  unit: string
}

interface InvoiceItem {
  productId: string
  quantity: number | string
  price: number | string
  vatRate: number | string
  unit?: string
  purchasePrice?: number | string
  profit?: number | string
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
  currency?: string
  exchangeRate?: number
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
  const type = initialData?.type || (searchParams.get("type") === "PURCHASE" ? "PURCHASE" : "SALES")
  
  // --- STATE ---
  const [currency, setCurrency] = useState(initialData?.currency || "TRY")
  const [exchangeRate, setExchangeRate] = useState<string>(initialData?.exchangeRate?.toString() || "1")

  const [items, setItems] = useState<InvoiceItem[]>(initialData?.items || [
    { productId: "", quantity: 1, price: 0, vatRate: 20, unit: "Adet", purchasePrice: 0, profit: 0 }
  ])

  const [payments, setPayments] = useState<Payment[]>(
    initialData?.payments?.map((p) => ({
        amount: Number(p.amount),
        date: new Date(p.date).toISOString().split('T')[0],
        note: p.note || ""
    })) || []
  )

  // --- HESAPLAMALAR ---
  // Kur değeri (display için)
  const numRate = parseFloat(exchangeRate.replace(',', '.')) || 1

  // Tüm hesaplamalar TL bazında yapılır
  const calculateTotalTL = () => {
    return items.reduce((acc, item) => {
      const price = Number(item.price) || 0       // Birim Fiyat (TL)
      const profit = Number(item.profit) || 0     // Kâr (TL)
      const qty = Number(item.quantity) || 1
      const vat = Number(item.vatRate) || 0
      const netPriceTL = price + profit
      return acc + (netPriceTL * qty * (1 + vat / 100))
    }, 0)
  }

  const calculatePaidTL = () => {
    // Ödeme tutarları seçili para biriminde girilir, TL'ye çevrilir
    return payments.reduce((acc, p) => {
      const amount = Number(p.amount) || 0
      // Döviz seçiliyse ödeme tutarını TL'ye çevir
      return acc + (currency === 'TRY' ? amount : amount * numRate)
    }, 0)
  }

  const totalAmountTL = calculateTotalTL()
  const paidAmountTL = calculatePaidTL()
  const remainingAmountTL = totalAmountTL - paidAmountTL

  // Döviz gösterimi: TL tutarı kura böl (sadece görüntü)
  const displayAmount = (amountTL: number) => {
    if (currency === 'TRY') return amountTL
    return amountTL / numRate
  }

  // --- HANDLERS (OLAYLAR) ---
  const handleRateChange = (val: string) => {
      setExchangeRate(val)
      // State TL bazlı, kur değişince item'lar değişmez, sadece display değişir
  }

  const handleCurrencyChange = (val: string) => {
      setCurrency(val)
      if(val === "TRY") {
          setExchangeRate("1")
      }
      // State TL bazlı, para birimi değişince item'lar değişmez
  }

  const handleMarkAsPaid = () => {
    if (remainingAmountTL <= 0) {
        toast.info("Zaten ödendi!")
        return
    }
    // Kalan tutarı seçili para biriminde gir
    const remainingInCurrency = displayAmount(remainingAmountTL)
    setPayments([...payments, { 
        amount: remainingInCurrency, 
        date: new Date().toISOString().split('T')[0],
        note: "Tamamı ödendi" 
    }])
  }

  const handleClearPayments = () => {
    if (confirm("Tüm ödeme kayıtları silinecek. Emin misin?")) setPayments([])
  }

  const handleSubmit = async (formData: FormData) => {
    formData.set("type", type)
    formData.set("currency", currency)
    formData.set("exchangeRate", exchangeRate.replace(',', '.'))

    // Sunucuya TL bazında gönder: price = birimFiyat + kâr
    const cleanItems = items.map((i) => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        price: Number(i.price) + (Number(i.profit) || 0),
        vatRate: Number(i.vatRate),
        unit: i.unit || "Adet",
        purchasePrice: Number(i.purchasePrice),
        profit: Number(i.profit)
    }))

    const cleanPayments = payments.map(p => {
        const amount = Number(p.amount) || 0
        // Dövizli ödemeler TL'ye çevrilerek sunucuya gönderilir
        return {
            amount: currency === 'TRY' ? amount : amount * numRate,
            date: p.date,
            note: p.note
        }
    })

    let res;
    if (initialData?.id) {
        res = await updateInvoice(initialData.id, formData, cleanItems, cleanPayments)
    } else {
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

  const handleProductChange = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId)
    // Tüm fiyatlar TL bazında state'e yazılır, kur dönüşümü sadece gösterimde

    setItems((prev) => {
        const newItems = [...prev]
        if (product) {
            const buyPriceVal = typeof product.buyPrice === 'object' ? Number(product.buyPrice) : (Number(product.buyPrice) || 0)
            const sellPriceVal = typeof product.price === 'object' ? Number(product.price) : (Number(product.price) || 0)
            
            if (type === 'SALES') {
                newItems[index] = { 
                    ...newItems[index], 
                    productId, 
                    purchasePrice: buyPriceVal,  // Maliyet (TL)
                    profit: 0,                   // Kâr 0'dan başlar
                    price: sellPriceVal,          // Birim Fiyat (TL)
                    vatRate: product.vatRate || 20,
                    unit: product.unit || "Adet"
                }
            } 
            else {
                // Alış faturası: alış fiyatını getir (TL)
                newItems[index] = { 
                    ...newItems[index], 
                    productId, 
                    purchasePrice: buyPriceVal,
                    profit: 0,
                    price: buyPriceVal, 
                    vatRate: product.vatRate || 20,
                    unit: product.unit || "Adet"
                }
            }
        }
        return newItems
    })
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
        const newItems = [...prev]
        newItems[index] = { ...newItems[index], [field]: value }

        // Kâr ve Birim Fiyat bağımsız alanlar, birbirini değiştirmez
        // Satır Toplamı = (Birim Fiyat + Kâr) × Miktar × (1 + KDV%)
        return newItems
    })
  }

  const updatePayment = (index: number, field: keyof Payment, value: string | number) => {
      setPayments((prev) => {
          const newPayments = [...prev]
          newPayments[index] = { ...newPayments[index], [field]: value }
          return newPayments
      })
  }

  // --- RENDER ---
  return (
    <form action={handleSubmit} className="space-y-6">
      
      {/* 1. ÜST BİLGİ KARTI */}
      <Card className={`border-l-4 ${type === 'PURCHASE' ? 'border-l-red-500' : 'border-l-blue-500'} shadow-sm`}>
        <CardHeader className="pb-2 border-b mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 flex-wrap">
                <span>{type === 'PURCHASE' ? 'Alış Faturası' : 'Satış Faturası'}</span>
                {type === 'SALES' && <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded">Maliyet + Kâr Modu</span>}
            </CardTitle>
            <div className="flex gap-2 w-full sm:w-auto">
                <Button type="button" variant="outline" size="sm" onClick={handleClearPayments} className="text-red-600 gap-1 flex-1 sm:flex-initial">
                    <RefreshCcw size={14}/> Sıfırla
                </Button>
                <Button type="button" variant="default" size="sm" onClick={handleMarkAsPaid} className="bg-emerald-600 hover:bg-emerald-700 gap-1 flex-1 sm:flex-initial">
                    <CheckCircle2 size={14}/> Tamamı Ödendi
                </Button>
            </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="sm:col-span-2">
                <Label>Cari Hesap</Label>
                <select 
                    name="customerId" 
                    defaultValue={initialData?.customerId} 
                    className="flex h-10 w-full rounded-md border border-input px-3 bg-background mt-1.5" 
                    required
                >
                    <option value="">Seçiniz...</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div>
                <Label>Para Birimi</Label>
                <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="mt-1.5"><SelectValue/></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                        <SelectItem value="USD">Dolar ($)</SelectItem>
                        <SelectItem value="EUR">Euro (€)</SelectItem>
                        <SelectItem value="GBP">Sterlin (£)</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            
            <div>
                <Label className="flex justify-between">
                    Kur 
                    {currency !== "TRY" && <span className="text-xs text-slate-400 font-normal">Manuel Giriniz</span>}
                </Label>
                <Input 
                    type="number" 
                    step="0.0001" 
                    value={exchangeRate} 
                    onChange={(e) => handleRateChange(e.target.value)} 
                    disabled={currency === "TRY"}
                    className="mt-1.5 font-bold"
                />
            </div>
        </CardContent>
      </Card>

      {/* 2. ÜRÜN LİSTESİ */}
      <Card>
        <CardContent className="p-0">
            {/* Desktop tablo görünümü */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr>
                        <th className="p-3 pl-6 w-62.5">Ürün</th>
                        <th className="p-3 w-24">Miktar</th>
                        {type === 'SALES' && (
                            <>
                                <th className="p-3 w-24 text-slate-400 font-normal text-right bg-slate-50/50">Maliyet</th>
                                <th className="p-3 w-24 text-emerald-600 font-bold text-right bg-emerald-50/30">Kâr (+/-)</th>
                            </>
                        )}
                        <th className="p-3 w-28 text-right">Birim Fiyat</th>
                        <th className="p-3 w-20 text-center">KDV %</th>
                        <th className="p-3 w-28 text-right font-bold text-slate-700">Satır Toplamı<br/><span className="text-[10px] font-normal">(KDV Dahil)</span></th>
                        <th className="p-3 w-10"></th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items.map((item, index) => {
                        const netPriceTL = (Number(item.price) + (Number(item.profit) || 0))
                        const rowTotalTL = netPriceTL * Number(item.quantity) * (1 + Number(item.vatRate)/100);
                        const rowTotal = displayAmount(rowTotalTL);
                        return (
                        <tr key={index} className="group hover:bg-slate-50/50">
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
                            <td className="p-3">
                                <div className="flex items-center gap-1">
                                    <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="w-16 h-9"/>
                                    <select
                                        value={item.unit || "Adet"}
                                        onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                        className="h-9 rounded-md border bg-transparent px-1 text-xs text-slate-500 w-16"
                                    >
                                        <option value="Adet">Adet</option>
                                        <option value="Kg">Kg</option>
                                        <option value="Metre">Metre</option>
                                        <option value="Lt">Litre</option>
                                        <option value="Koli">Koli</option>
                                    </select>
                                </div>
                            </td>
                            {type === 'SALES' && (
                                <>
                                    <td className="p-3">
                                        <Input 
                                            disabled 
                                            value={new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(item.purchasePrice))} 
                                            className="bg-slate-100/50 text-slate-400 border-transparent text-right h-9"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input 
                                            type="number" 
                                            value={item.profit} 
                                            onChange={(e) => updateItem(index, 'profit', e.target.value)} 
                                            placeholder="0"
                                            className="text-right font-bold text-emerald-600 border-emerald-200 bg-emerald-50 focus:bg-white h-9"
                                        />
                                    </td>
                                </>
                            )}
                            <td className="p-3">
                                <Input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} className="text-right font-bold h-9"/>
                            </td>
                            <td className="p-3">
                                <Input type="number" value={item.vatRate} onChange={(e) => updateItem(index, 'vatRate', e.target.value)} className="text-center h-9" />
                            </td>
                            <td className="p-3 text-right font-mono font-medium text-slate-700">
                                {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rowTotal)} {currency === "TRY" ? "₺" : currency}
                            </td>
                            <td className="p-3 text-center">
                                <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))} className="h-8 w-8 text-slate-400 hover:text-red-500">
                                    <Trash2 size={16}/>
                                </Button>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
            </div>

            {/* Mobil kart görünümü */}
            <div className="md:hidden divide-y">
                {items.map((item, index) => {
                    const netPriceTL = (Number(item.price) + (Number(item.profit) || 0))
                    const rowTotalTL = netPriceTL * Number(item.quantity) * (1 + Number(item.vatRate)/100);
                    const rowTotal = displayAmount(rowTotalTL);
                    return (
                    <div key={index} className="p-4 space-y-3 relative">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase">Ürün #{index + 1}</span>
                            <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, i) => i !== index))} className="h-7 w-7 text-slate-400 hover:text-red-500">
                                <Trash2 size={14}/>
                            </Button>
                        </div>
                        <select 
                            value={item.productId}
                            onChange={(e) => handleProductChange(index, e.target.value)}
                            className="flex h-10 w-full rounded-md border bg-transparent px-3 text-sm"
                            required
                        >
                            <option value="">Ürün Seçiniz...</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-xs text-slate-500">Miktar</label>
                                <Input type="number" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} className="h-9"/>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">Birim</label>
                                <select
                                    value={item.unit || "Adet"}
                                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                    className="flex h-9 w-full rounded-md border bg-transparent px-2 text-sm"
                                >
                                    <option value="Adet">Adet</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Metre">Metre</option>
                                    <option value="Lt">Litre</option>
                                    <option value="Koli">Koli</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500">KDV %</label>
                                <Input type="number" value={item.vatRate} onChange={(e) => updateItem(index, 'vatRate', e.target.value)} className="h-9"/>
                            </div>
                        </div>
                        {type === 'SALES' && (
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs text-slate-400">Maliyet</label>
                                    <Input 
                                        disabled 
                                        value={new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(Number(item.purchasePrice))} 
                                        className="bg-slate-100/50 text-slate-400 border-transparent h-9"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-emerald-600 font-semibold">Kâr (+/-)</label>
                                    <Input 
                                        type="number" 
                                        value={item.profit} 
                                        onChange={(e) => updateItem(index, 'profit', e.target.value)} 
                                        placeholder="0"
                                        className="font-bold text-emerald-600 border-emerald-200 bg-emerald-50 focus:bg-white h-9"
                                    />
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-xs text-slate-500">Birim Fiyat</label>
                                <Input type="number" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} className="font-bold h-9"/>
                            </div>
                            <div className="flex flex-col justify-end">
                                <label className="text-xs text-slate-500">Satır Toplamı</label>
                                <div className="h-9 flex items-center justify-end font-mono font-bold text-slate-700 bg-slate-50 rounded-md px-3 border">
                                    {new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(rowTotal)} {currency === "TRY" ? "₺" : currency}
                                </div>
                            </div>
                        </div>
                    </div>
                )})}
            </div>

            <div className="p-4 bg-slate-50 border-t">
                <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setItems([...items, { productId: "", quantity: 1, price: 0, vatRate: 20, unit: "Adet", purchasePrice: 0, profit: 0 }])}>
                    <Plus size={16} className="mr-2"/> Yeni Satır
                </Button>
            </div>
        </CardContent>
      </Card>

      {/* 3. ÖDEME VE TOPLAM ALANI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-slate-500"/> Tahsilat / Ödeme
                  </CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="space-y-3">
                      {payments.map((p, idx) => (
                          <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:items-end border-b pb-3 last:border-0">
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400">Tarih</label>
                                  <Input type="date" value={p.date} onChange={(e) => updatePayment(idx, 'date', e.target.value)} className="h-9 sm:h-8"/>
                              </div>
                              <div className="flex-1">
                                  <label className="text-xs text-slate-400">Tutar ({currency})</label>
                                  <Input type="number" value={p.amount} onChange={(e) => updatePayment(idx, 'amount', e.target.value)} className="h-9 sm:h-8 font-bold"/>
                              </div>
                              <Button type="button" variant="ghost" size="icon" onClick={() => setPayments(payments.filter((_, i) => i !== idx))} className="h-8 w-8 text-red-500 self-end">
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

          <Card className="bg-slate-50 border-slate-200">
              <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500 font-medium">Genel Toplam</span>
                      <span className="font-bold text-lg text-slate-800">
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(displayAmount(totalAmountTL))}
                      </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400 -mt-2">
                      <span>(KDV Dahil)</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-emerald-600">
                      <span>Ödenen</span>
                      <span className="font-bold">(-) {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(displayAmount(paidAmountTL))}</span>
                  </div>
                  <div className="h-px bg-slate-300 my-2"></div>
                  <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">KALAN</span>
                      <span className={`text-2xl font-black ${remainingAmountTL > 0.1 ? 'text-red-600' : 'text-slate-400'}`}>
                          {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: currency }).format(displayAmount(remainingAmountTL))}
                      </span>
                  </div>
              </CardContent>
          </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-end pt-4 gap-3">
          <Input type="date" name="date" className="w-full sm:w-auto" defaultValue={initialData ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} />
          <Button type="submit" size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
              <Calculator className="mr-2 h-4 w-4"/>
              {initialData ? 'Değişiklikleri Kaydet' : 'Faturayı Tamamla'}
          </Button>
      </div>
    </form>
  )
}