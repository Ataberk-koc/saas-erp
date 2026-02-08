"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Wallet, CheckCircle, XCircle, Calendar, Plus, Trash2, ArrowRight } from "lucide-react"
import { completePayment, cancelInvoice, addPayment, deletePayment } from "@/app/actions/invoice"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Payment {
  id: string
  amount: number
  date: Date
  note: string | null
}

interface Props {
  invoiceId: string
  totalAmount: number
  payments: Payment[]
  currency: string
  exchangeRate: number
}

export function PaymentDetailButton({ invoiceId, totalAmount, payments, currency, exchangeRate }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  
  // Yeni Ödeme Form State'i
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  // Döviz gösterimi: TL tutarını fatura para birimine çevir
  const curr = currency || 'TRY'
  const rate = exchangeRate || 1
  const toDisplay = (amountTL: number) => curr === 'TRY' ? amountTL : amountTL / rate

  // Hesaplamalar (TL bazında)
  const paidAmount = payments.reduce((acc, p) => acc + Number(p.amount), 0)
  const remainingAmount = totalAmount - paidAmount
  const isPaid = remainingAmount <= 0.1

  const formatMoney = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: curr }).format(val)

  // 1. Yeni Ödeme Ekle
  const handleAddPayment = async () => {
    if (!amount || Number(amount) <= 0) return toast.error("Geçerli bir tutar giriniz.")
    
    // Kullanıcı fatura para biriminde girer, TL'ye çevirip sunucuya gönder
    const amountInCurrency = Number(amount)
    const amountTL = curr === 'TRY' ? amountInCurrency : amountInCurrency * rate
    
    setLoading(true)
    const res = await addPayment(invoiceId, amountTL, date, note)
    setLoading(false)

    if (res.success) {
      toast.success("Ödeme eklendi")
      setAmount("") // Formu temizle
      setNote("")
      router.refresh()
    } else {
      toast.error("Hata oluştu")
    }
  }

  // 2. Ödeme Sil
  const handleDeletePayment = async (paymentId: string) => {
    if(!confirm("Bu ödeme kaydı silinecek. Emin misin?")) return
    const res = await deletePayment(paymentId, invoiceId)
    if (res.success) {
      toast.success("Ödeme silindi")
      router.refresh()
    }
  }

  // 3. Kalanı Tamamla
  const handleComplete = async () => {
    if (remainingAmount <= 0) return
    // remainingAmount zaten TL bazında, direkt gönder
    const res = await completePayment(invoiceId, remainingAmount)
    if (res.success) {
      toast.success("Tahsilat tamamlandı!")
      setOpen(false)
      router.refresh()
    }
  }

  // 4. İptal Et
  const handleCancel = async () => {
    if (!confirm("Fatura iptal edilecek. Emin misin?")) return
    const res = await cancelInvoice(invoiceId)
    if (res.success) {
      toast.info("Fatura iptal edildi.")
      setOpen(false)
      router.refresh()
    }
  }

  const formatCurrency = (val: number) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)
  // Tüm gösterimlerde fatura para birimini kullan
  const displayTotal = toDisplay(totalAmount)
  const displayPaid = toDisplay(paidAmount)
  const displayRemaining = Math.max(0, toDisplay(remainingAmount))
  const overpayment = remainingAmount < -0.1 ? toDisplay(Math.abs(remainingAmount)) : 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2 border-emerald-200 hover:bg-emerald-50 text-emerald-700">
          <Wallet className="h-4 w-4" />
          Ödeme & Tahsilat
        </Button>
      </PopoverTrigger>
      
      {/* Popover Genişliğini Artırdık (w-96) */}
      <PopoverContent className="w-96 p-0" align="end">
        
        {/* --- BAŞLIK & ÖZET --- */}
        <div className="bg-slate-50 p-4 border-b">
          <h4 className="font-bold text-slate-800 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-600"/> Ödeme Yönetimi
          </h4>
          
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="bg-white p-2 rounded border">
                <div className="text-[10px] text-slate-500 uppercase">Toplam</div>
                <div className="font-bold text-sm">{formatMoney(displayTotal)}</div>
            </div>
            <div className="p-2 rounded border border-emerald-100 bg-emerald-50/50">
                <div className="text-[10px] text-emerald-600 uppercase">Ödenen</div>
                <div className="font-bold text-sm text-emerald-700">{formatMoney(displayPaid)}</div>
            </div>
            <div className={`p-2 rounded border ${isPaid ? 'border-emerald-100 bg-emerald-50/50' : 'border-red-100 bg-red-50/50'}`}>
                <div className={`text-[10px] uppercase ${isPaid ? 'text-emerald-600' : 'text-red-600'}`}>Kalan</div>
                <div className={`font-bold text-sm ${isPaid ? 'text-emerald-700' : 'text-red-700'}`}>{formatMoney(displayRemaining)}</div>
                {overpayment > 0 && <div className="text-[9px] text-amber-600 mt-0.5">+{formatMoney(overpayment)} fazla</div>}
            </div>
          </div>
        </div>

        {/* --- YENİ ÖDEME EKLEME FORMU --- */}
        {!isPaid && (
            <div className="p-4 bg-white border-b space-y-3">
                <Label className="text-xs font-bold text-slate-500 uppercase">Hızlı Tahsilat Ekle</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Input 
                            type="number" 
                            placeholder="Tutar" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            className="h-9 font-bold"
                        />
                    </div>
                    <div className="w-32">
                        <Input 
                            type="date" 
                            value={date} 
                            onChange={e => setDate(e.target.value)}
                            className="h-9"
                        />
                    </div>
                </div>
                <div className="flex gap-2">
                    <Input 
                        placeholder="Not (Opsiyonel)" 
                        value={note} 
                        onChange={e => setNote(e.target.value)}
                        className="h-9 text-xs"
                    />
                    <Button size="sm" onClick={handleAddPayment} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        )}

        {/* --- GEÇMİŞ LİSTESİ --- */}
        <div className="max-h-60 overflow-y-auto">
            <div className="p-2 bg-slate-100/50 text-xs font-bold text-slate-500 uppercase px-4 border-b">
                Ödeme Hareketleri
            </div>
            {payments.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                    Henüz ödeme kaydı yok.
                </div>
            ) : (
                <div className="divide-y">
                    {payments.map((p) => (
                        <div key={p.id} className="p-3 hover:bg-slate-50 flex justify-between items-center group">
                            <div className="flex items-start gap-3">
                                <div className="mt-1 bg-emerald-100 p-1.5 rounded-full text-emerald-600">
                                    <ArrowRight className="h-3 w-3" />
                                </div>
                                <div>
                                    <div className="font-bold text-slate-700">
                                        {formatMoney(toDisplay(Number(p.amount)))}
                                    </div>
                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                        <Calendar className="h-3 w-3"/>
                                        {new Date(p.date).toLocaleDateString('tr-TR')}
                                        {p.note && <span className="text-slate-400">• {p.note}</span>}
                                    </div>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDeletePayment(p.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* --- ALT BUTONLAR --- */}
        <div className="p-3 bg-slate-50 border-t grid grid-cols-2 gap-2">
           <Button 
             size="sm" 
             variant="ghost" 
             className="text-red-600 hover:bg-red-50 hover:text-red-700 text-xs"
             onClick={handleCancel}
           >
             <XCircle className="h-3.5 w-3.5 mr-1" /> Faturayı İptal Et
           </Button>

           <Button 
             size="sm" 
             className="bg-slate-800 hover:bg-slate-900 text-white text-xs"
             disabled={isPaid}
             onClick={handleComplete}
           >
             <CheckCircle className="h-3.5 w-3.5 mr-1" /> {isPaid ? "Ödeme Tamamlandı" : "Kalanı Kapat"}
           </Button>
        </div>

      </PopoverContent>
    </Popover>
  )
}