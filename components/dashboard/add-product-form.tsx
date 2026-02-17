"use client"

import { useRef, useState } from "react"
import { addProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import { containsXSS } from "@/lib/utils"

export function AddProductForm() {
  const formRef = useRef<HTMLFormElement>(null)
  
  // 👇 KRİTİK ÇÖZÜM: useRef anında güncellenir, çift tıklamayı donanım seviyesinde engeller gibi çalışır.
  const isSubmittingRef = useRef(false) 
  
  // UI'daki butonu disable yapmak için state (Görsel kilit)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)
  const [currency, setCurrency] = useState("TRY")
  const [unit, setUnit] = useState("Adet")

  async function handleSave(formData: FormData) {
    // 1. REF KONTROLÜ (En hızlı kilit)
    if (isSubmittingRef.current) return
    
    // 2. Kapıları kilitle
    isSubmittingRef.current = true
    setIsSubmitting(true)

    // Form verilerini ayarla
    formData.set("currency", currency)
    formData.set("unit", unit)

    // XSS Kontrolü
    const name = formData.get("name") as string
    if (containsXSS(name)) {
      toast.error("Ürün adında güvenlik riski oluşturan içerik tespit edildi!")
      // Hata varsa kilitleri aç
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const result = await addProduct(formData) as {
        error?: string
        success?: boolean
        message?: string
        confirmationRequired?: boolean
      }

      if (result?.confirmationRequired) {
        setPendingFormData(formData)
        setConfirmMessage(result.message || "Bu isimde bir ürün zaten mevcut.")
        setConfirmOpen(true)
        // Modal açılsa bile form işlemini bitirmiş sayıp kilidi açıyoruz ki kullanıcı modalda takılmasın
        return
      }

      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(result?.message || "Ürün başarıyla eklendi!")
        formRef.current?.reset()
        // State'leri sıfırla
        setUnit("Adet")
        setCurrency("TRY")
      }
    } catch {
      toast.error("Beklenmedik bir hata oluştu.")
    } finally {
      // 👇 İŞLEM BİTER BİTMEZ KİLİTLERİ AÇ
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  async function handleConfirmMerge() {
    if (!pendingFormData) return
    
    // Modaldaki buton için de aynı koruma
    if (isSubmittingRef.current) return
    isSubmittingRef.current = true
    setIsSubmitting(true)

    const mergeData = new FormData()
    pendingFormData.forEach((value, key) => {
      mergeData.append(key, value)
    })
    mergeData.append("forceMerge", "true")

    try {
        const result = await addProduct(mergeData) as {
            error?: string
            success?: boolean
            message?: string
        }

        if (result?.error) {
            toast.error(result.error)
        } else {
            toast.success(result?.message || "Stoklar başarıyla birleştirildi!")
            formRef.current?.reset()
            setUnit("Adet")
            setCurrency("TRY")
        }
    } catch {
        toast.error("Birleştirme sırasında hata oluştu.")
    } finally {
        setPendingFormData(null)
        setConfirmOpen(false)
        isSubmittingRef.current = false
        setIsSubmitting(false)
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
            <Select value={unit} onValueChange={setUnit}>
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
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue placeholder="Para Birimi Seç" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TRY">₺ TRY</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
                <SelectItem value="EUR">€ EUR</SelectItem>
                <SelectItem value="GBP">£ GBP</SelectItem>
                <SelectItem value="MKD">Makedon Dinarı (MKD)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full md:w-auto" disabled={isSubmitting}>
            {isSubmitting ? "Ekleniyor..." : "Ekle"}
          </Button>
        </form>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Mevcut Ürün Tespit Edildi</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setPendingFormData(null); setConfirmOpen(false) }}>
              Hayır, İptal Et
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmMerge} disabled={isSubmitting}>
               {isSubmitting ? "İşleniyor..." : "Evet, Stoğa Ekle"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}