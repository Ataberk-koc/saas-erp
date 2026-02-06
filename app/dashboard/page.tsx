import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { DashboardAiCard } from "@/components/dashboard/ai-card"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // 1. TÜM VERİLERİ ÇEKİYORUZ
  const [invoices, expenses, customersCount] = await Promise.all([
    // A. Faturaları Çek (Alış ve Satış)
    prisma.invoice.findMany({
      where: { tenantId: user?.tenantId },
      include: { 
        items: true, 
        customer: true 
      },
      orderBy: { date: 'desc' },
    }),
    // B. Ekstra Harcamalar (Fiş, Kira vb.)
    prisma.expense.findMany({
      where: { tenantId: user?.tenantId },
    }),
    // C. Müşteri Sayısı
    prisma.customer.count({
      where: { tenantId: user?.tenantId },
    })
  ])

  // --- HESAPLAMA MOTORU ---

  // 1. TOPLAM CİRO (Kasadaki Para - Sadece Ödenmiş Satışlar)
  const totalRevenue = invoices
    .filter(inv => inv.type === 'SALES' && inv.status === 'PAID')
    .reduce((total, inv) => {
      const invTotal = inv.items.reduce((acc, item) => {
        const lineTotal = Number(item.price) * item.quantity
        const tax = lineTotal * (item.vatRate / 100)
        return acc + lineTotal + tax
      }, 0)
      return total + invTotal
    }, 0)

  // 2. TOPLAM GİDERLER (Nakdi Çıkan Para)
  // A. Giderler Tablosu (Kira, Fatura vb.)
  const generalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0)
  
  // B. Alış Faturaları (Mal Alımları - Ödenmiş olanlar)
  const purchaseInvoicesTotal = invoices
    .filter(inv => inv.type === 'PURCHASE' && inv.status === 'PAID')
    .reduce((total, inv) => {
      const invTotal = inv.items.reduce((acc, item) => {
        const lineTotal = Number(item.price) * item.quantity
        const tax = lineTotal * (item.vatRate / 100)
        return acc + lineTotal + tax
      }, 0)
      return total + invTotal
    }, 0)

  // Toplam Nakit Çıkışı (Alış Faturaları + Harcamalar)
  const totalExpenses = generalExpenses + purchaseInvoicesTotal

  // 3. BRÜT KÂR (Satış Cirosu - Alış Faturaları Toplamı)
  // Genel giderler (kira, fatura vb.) düşülmez, sadece mal alış-satış farkı
  const grossProfit = totalRevenue - purchaseInvoicesTotal

  // 4. NET KÂR (Cebine Kalan Nakit)
  // Ciro - (Alış Faturaları + Genel Giderler)
  const netCashFlow = totalRevenue - totalExpenses

  // 5. BEKLEYEN ALACAK (Henüz ödenmemiş satışlar)
  const pendingAmount = invoices
    .filter(inv => inv.type === 'SALES' && inv.status === 'PENDING')
    .reduce((total, inv) => {
      const invTotal = inv.items.reduce((acc, item) => {
        const lineTotal = Number(item.price) * item.quantity
        const tax = lineTotal * (item.vatRate / 100)
        return acc + lineTotal + tax
      }, 0)
      return total + invTotal
    }, 0)


  // Para Formatı
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount)
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-6 md:space-y-8">      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">Genel Bakış</h1>
        <div className="text-sm text-slate-500">
           Hoş geldin, <span className="font-semibold text-slate-800">{user?.name}</span>
        </div>
      </div>

      <div className="w-full">
         <DashboardAiCard />
      </div>

      {/* --- 1. SIRA: FİNANSAL DURUM (4 KART) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 1. KUTU: TOPLAM CİRO */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Toplam Ciro</CardTitle>
            <span className="text-emerald-500 text-lg">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</div>
            <p className="text-[10px] text-slate-400 mt-1">Kasadaki Para</p>
          </CardContent>
        </Card>

        {/* 2. KUTU: TOPLAM GİDER */}
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Toplam Gider</CardTitle>
            <span className="text-red-500 text-lg">💸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{formatCurrency(totalExpenses)}</div>
            <p className="text-[10px] text-slate-400 mt-1">Alış Faturaları + Masraflar</p>
          </CardContent>
        </Card>

        {/* 3. KUTU: BRÜT KÂR (Ürün Kârı - YENİ) */}
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Brüt Kâr</CardTitle>
            <span className="text-blue-500 text-lg">📈</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{formatCurrency(grossProfit)}</div>
            <p className="text-[10px] text-slate-400 mt-1">Sadece Mal Ticareti Kârı</p>
          </CardContent>
        </Card>

        {/* 4. KUTU: NET KÂR (Nakit Akışı) */}
        <Card className={`border-l-4 shadow-sm ${netCashFlow >= 0 ? 'border-l-indigo-600' : 'border-l-orange-600'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase">Net Kâr</CardTitle>
            <span className="text-lg">📊</span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>
                {formatCurrency(netCashFlow)}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Ciro - Tüm Giderler</p>
          </CardContent>
        </Card>

      </div>

      {/* --- 2. SIRA: OPERASYONEL DURUM (3 KART) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* BEKLEYEN ALACAK */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Bekleyen Alacak</CardTitle>
            <span className="text-amber-500 text-xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-slate-400 mt-1">Tahsil edilecek satışlar</p>
          </CardContent>
        </Card>

        {/* MÜŞTERİ SAYISI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Müşteriler</CardTitle>
            <span className="text-blue-500 text-xl">👥</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{customersCount}</div>
            <p className="text-xs text-slate-400 mt-1">Aktif cari hesap</p>
          </CardContent>
        </Card>

        {/* FATURA SAYISI */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Toplam İşlem</CardTitle>
            <span className="text-purple-500 text-xl">🧾</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{invoices.length}</div>
            <p className="text-xs text-slate-400 mt-1">Alış + Satış Faturası</p>
          </CardContent>
        </Card>
      </div>

      {/* --- 3. SIRA: LİSTELER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TABLO: Son Faturalar */}
        <div className="lg:col-span-2">
           <Card className="h-full border border-slate-200">
             <CardHeader>
               <CardTitle>Son Hareketler</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-slate-500 bg-slate-50 border-b">
                     <tr>
                       <th className="p-3 font-medium">Tür</th>
                       <th className="p-3 font-medium">Muhatap</th>
                       <th className="p-3 font-medium text-right">Tutar</th>
                       <th className="p-3 font-medium text-center">Durum</th>
                     </tr>
                   </thead>
                   <tbody>
                     {invoices.slice(0, 5).map(inv => {
                        const total = inv.items.reduce((acc, item) => {
                             const line = Number(item.price) * item.quantity
                             return acc + line + (line * (item.vatRate/100))
                        }, 0)
                        const isSales = inv.type === 'SALES'

                        return (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                                {isSales ? (
                                    <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">SATIŞ</span>
                                ) : (
                                    <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded">ALIŞ</span>
                                )}
                            </td>
                            <td className="p-3 font-medium text-slate-700">{inv.customer.name}</td>
                            <td className={`p-3 font-bold text-right ${isSales ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isSales ? '+' : '-'}{formatCurrency(total)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-red-100 text-red-700 border-red-200'
                              }`}>
                                {inv.status === 'PAID' ? 'TAMAMLANDI' : inv.status === 'PENDING' ? 'BEKLİYOR' : 'İPTAL'}
                              </span>
                            </td>
                          </tr>
                        )
                     })}
                     {invoices.length === 0 && (
                       <tr><td colSpan={4} className="p-6 text-center text-slate-500">Henüz hiç işlem yok.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
             </CardContent>
           </Card>
        </div>

        {/* SAĞ PANEL: Hızlı İşlemler */}
        <div className="space-y-6">
            <Card className="border border-slate-200">
                <CardHeader>
                    <CardTitle>⚡ Hızlı İşlemler</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3">
                    <Link href="/dashboard/invoices/create" className="block group">
                        <div className="p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer flex items-center gap-4 bg-white shadow-sm group-hover:shadow-md">
                            <div className="bg-blue-100 p-2 rounded-full text-blue-600 text-xl">📄</div>
                            <div>
                                <div className="font-bold text-slate-700 group-hover:text-blue-700">Fatura Kes</div>
                                <div className="text-xs text-slate-500">Yeni satış oluştur</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard/invoices?type=PURCHASE" className="block group">
                        <div className="p-4 border rounded-lg hover:bg-red-50 hover:border-red-200 transition cursor-pointer flex items-center gap-4 bg-white shadow-sm group-hover:shadow-md">
                            <div className="bg-red-100 p-2 rounded-full text-red-600 text-xl">🛒</div>
                            <div>
                                <div className="font-bold text-slate-700 group-hover:text-red-700">Alış Yap</div>
                                <div className="text-xs text-slate-500">Stok girişi ve gider</div>
                            </div>
                        </div>
                    </Link>
                    <Link href="/dashboard/products" className="block group">
                        <div className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-200 transition cursor-pointer flex items-center gap-4 bg-white shadow-sm group-hover:shadow-md">
                            <div className="bg-purple-100 p-2 rounded-full text-purple-600 text-xl">📦</div>
                            <div>
                                <div className="font-bold text-slate-700 group-hover:text-purple-700">Ürün Ekle</div>
                                <div className="text-xs text-slate-500">Stok veya hizmet</div>
                            </div>
                        </div>
                    </Link>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  )
}