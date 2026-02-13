"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createPurchaseInvoice } from "@/app/actions/purchase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { CurrencyInput } from "@/components/ui/currency-input"
import { containsXSS } from "@/lib/utils"

// Tip Tanımları
interface Customer {
  id: string
  name: string
  type: string
}

// Form state'i için arayüz (Interface)
interface InvoiceItem {
  productName: string
  quantity: number | string // Input'tan string gelebilir
  price: number | string
  vatRate: number | string
  unit: string
}

export default function PurchaseForm({ customers }: { customers: Customer[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // --- Form State'leri ---
  const [supplierId, setSupplierId] = useState("")
  const [documentNumber, setDocumentNumber] = useState("")
  const [gcbNo, setGcbNo] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  
  // --- Döviz State'leri ---
  const [currency, setCurrency] = useState("TRY")
  const [exchangeRate, setExchangeRate] = useState<string>("1")

  const [items, setItems] = useState<InvoiceItem[]>([
    { productName: "", quantity: 1, price: 0, vatRate: 20, unit: "Adet" }
  ])

  // --- Fonksiyonlar ---
  const addItem = () => {
    setItems([...items, { productName: "", quantity: 1, price: 0, vatRate: 20, unit: "Adet" }])
  }

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  // 👇 DÜZELTME 1 & 2: 'any' ve '@ts-ignore' kaldırıldı, Type-Safe yapıldı.
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items]
    
    if (field === "productName") {
      newItems[index].productName = value as string
    } else {
      // quantity, price, vatRate gibi alanlar için
      newItems[index] = {
        ...newItems[index],
        [field]: value
      }
    }
    
    setItems(newItems)
  }

  // --- Döviz Fonksiyonları ---
  const numRate = parseFloat(exchangeRate.replace(',', '.')) || 1

  const handleCurrencyChange = (val: string) => {
    setCurrency(val)
    if (val === "TRY") setExchangeRate("1")
  }

  const calculateTotalTL = () => {
    return items.reduce((acc, item) => {
      return acc + (Number(item.quantity) * Number(item.price) * (1 + Number(item.vatRate) / 100))
    }, 0)
  }

  // Döviz gösterim: TL tutarı kura böl
  const displayAmount = (amountTL: number) => {
    if (currency === 'TRY') return amountTL
    return amountTL / numRate
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (!supplierId) {
      setError("Lütfen bir tedarikçi seçiniz.")
      setLoading(false)
      return
    }

    // XSS ön kontrolü (client-side)
    for (const item of items) {
      if (containsXSS(item.productName)) {
        setError("Ürün adında güvenlik riski oluşturan içerik tespit edildi!")
        setLoading(false)
        return
      }
    }
    if (documentNumber && containsXSS(documentNumber)) {
      setError("Belge numarasında güvenlik riski oluşturan içerik tespit edildi!")
      setLoading(false)
      return
    }

    const formData = {
      supplierId,
      documentNumber,
      gcbNo,
      date: new Date(date),
      currency,
      exchangeRate: parseFloat(exchangeRate.replace(',', '.')) || 1,
      items: items.map(item => ({
        ...item,
        quantity: Number(item.quantity),
        price: Number(item.price),
        vatRate: Number(item.vatRate),
        unit: item.unit || "Adet"
      }))
    }

    const result = await createPurchaseInvoice(formData)

    if (result.error) {
      setError(result.error)
    } else {
      alert("✅ Alış faturası kaydedildi ve stoklar güncellendi!")
      router.push("/dashboard/invoices") 
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Card className="border-t-4 border-t-blue-600 shadow-lg">
      <CardContent className="p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md border border-red-200 text-sm font-medium">
              🚨 {error}
            </div>
          )}

          {/* 1. FATURA BAŞLIK BİLGİLERİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-2">
              <Label>Tedarikçi / Cari Hesap</Label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                required
              >
                <option value="" disabled>Seçiniz...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.type === "SUPPLIER" ? "(Tedarikçi)" : ""}
                  </option>
                ))}
              </select>
              {/* 👇 DÜZELTME 3: Tırnak işaretleri düzeltildi (&quot;) */}
              <p className="text-[10px] text-gray-400">Listede yoksa önce &quot;Cariler&quot; menüsünden ekleyin.</p>
            </div>

            <div className="space-y-2">
              <Label>Fatura / Belge No</Label>
              <Input 
                placeholder="Örn: GIB2024..." 
                value={documentNumber} 
                onChange={(e) => setDocumentNumber(e.target.value)} 
              />
            </div>

            <div className="space-y-2">
              <Label>GÇB No</Label>
              <Input 
                placeholder="Gümrük Çıkış Beyanname No" 
                value={gcbNo} 
                onChange={(e) => setGcbNo(e.target.value)} 
              />
              <p className="text-[10px] text-gray-400">Gümrük Çıkış Beyannamesi numarası (opsiyonel)</p>
            </div>

            <div className="space-y-2">
              <Label>Fatura Tarihi</Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required
              />
            </div>
          </div>

          {/* DÖVİZ SEÇİMİ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Select value={currency} onValueChange={handleCurrencyChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">Türk Lirası (₺)</SelectItem>
                  <SelectItem value="USD">Dolar ($)</SelectItem>
                  <SelectItem value="EUR">Euro (€)</SelectItem>
                  <SelectItem value="GBP">Sterlin (£)</SelectItem>
                  <SelectItem value="MKD">Makedon Dinarı (MKD)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between">
                Kur
                {currency !== "TRY" && <span className="text-xs text-gray-400 font-normal">Manuel Giriniz</span>}
              </Label>
              <Input
                type="number"
                step="0.0001"
                value={exchangeRate}
                onChange={(e) => setExchangeRate(e.target.value)}
                disabled={currency === "TRY"}
                className="font-bold"
                placeholder="Örn: 32.50"
              />
              {currency !== "TRY" && (
                <p className="text-[10px] text-gray-400">1 {currency} = {numRate} TL olarak kaydedilecek</p>
              )}
            </div>
          </div>

          <div className="border-t border-dashed my-6"></div>

          {/* 2. ÜRÜNLER LİSTESİ */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                📦 Alınan Ürünler / Hizmetler
              </h3>
              <Button type="button" onClick={addItem} variant="outline" size="sm" className="gap-2">
                <Plus size={16} /> Yeni Satır
              </Button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end p-4 border rounded-lg bg-gray-50/50 hover:bg-gray-50 transition-colors">
                
                <div className="md:col-span-3 col-span-12 space-y-1">
                  <Label className="text-xs text-gray-500">Ürün Adı</Label>
                  <Input 
                    placeholder="Örn: iPhone 15 Kılıf" 
                    value={item.productName}
                    onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                    required
                    className="bg-white"
                  />
                  <span className="text-[10px] text-blue-500 font-medium">
                     *Sistemde yoksa otomatik oluşturulur.
                  </span>
                </div>

                <div className="md:col-span-2 col-span-3 space-y-1">
                  <Label className="text-xs text-gray-500">Miktar</Label>
                  <Input 
                    type="number" 
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                    className="bg-white text-center"
                  />
                </div>

                <div className="md:col-span-2 col-span-3 space-y-1">
                  <Label className="text-xs text-gray-500">Birim</Label>
                  <select
                    value={item.unit}
                    onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-2 py-2 text-sm"
                  >
                    <option value="Adet">Adet</option>
                    <option value="Kg">Kg</option>
                    <option value="Metre">Metre</option>
                    <option value="Lt">Litre</option>
                    <option value="Koli">Koli</option>
                  </select>
                </div>

                <div className="md:col-span-2 col-span-6 space-y-1">
                  <Label className="text-xs text-gray-500">Birim Alış Fiyatı</Label>
                  <CurrencyInput 
                    value={item.price}
                    onValueChange={(v) => handleItemChange(index, "price", v)}
                    className="bg-white text-right"
                  />
                </div>

                <div className="md:col-span-2 col-span-6 space-y-1">
                  <Label className="text-xs text-gray-500">KDV (%)</Label>
                  <Input 
                    type="number" 
                    value={item.vatRate}
                    onChange={(e) => handleItemChange(index, "vatRate", e.target.value)}
                    className="bg-white text-center"
                  />
                </div>

                <div className="md:col-span-1 col-span-6 flex justify-end pb-1">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* 3. ALT TOPLAM VE KAYDET */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mt-8 pt-6 border-t">
            <Link href="/dashboard/invoices" className="text-sm text-gray-500 hover:underline flex items-center gap-1">
              <ArrowLeft size={16} /> Vazgeç ve Dön
            </Link>

            <div className="flex items-center gap-6 w-full md:w-auto">
              <div className="text-right">
                <p className="text-sm text-gray-500">Genel Toplam</p>
                <p className="text-2xl font-bold text-blue-600">
                  {new Intl.NumberFormat("tr-TR", { style: "currency", currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(displayAmount(calculateTotalTL()))}
                </p>
                {currency !== "TRY" && (
                  <p className="text-xs text-gray-400">
                    ≈ {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(calculateTotalTL())}
                  </p>
                )}
              </div>

              <Button type="submit" size="lg" className="bg-blue-600 hover:bg-blue-700 gap-2 px-8" disabled={loading}>
                {loading ? "İşleniyor..." : <><Save size={18} /> Kaydet</>}
              </Button>
            </div>
          </div>

        </form>
      </CardContent>
    </Card>
  )
}