import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { DashboardAiCard } from "@/components/dashboard/ai-card"
import { OverviewChart } from "@/components/dashboard/overview-chart"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // 1. VERİLERİ ÇEKİYORUZ
  const [invoices, expenses, customersCount] = await Promise.all([
    // A. Faturalar (Gelirler)
    prisma.invoice.findMany({
      where: { tenantId: user?.tenantId },
      include: { items: true, customer: true },
      orderBy: { date: 'asc' }, // Grafikte doğru sıralama için eskiden yeniye
    }),
    // B. Giderler
    prisma.expense.findMany({
      where: { tenantId: user?.tenantId },
      orderBy: { date: 'asc' },
    }),
    // C. Müşteri Sayısı
    prisma.customer.count({
      where: { tenantId: user?.tenantId },
    })
  ])

  // --- GRAFİK VERİSİNİ HAZIRLA (Son 6 Ay) ---
  const monthlyData: Record<string, { name: string; gelir: number; gider: number }> = {};
  
  // Son 6 ayın isimlerini oluştur (Örn: "Oca", "Şub")
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const monthKey = d.toLocaleString('tr-TR', { month: 'short' }); 
    monthlyData[monthKey] = { name: monthKey, gelir: 0, gider: 0 };
  }

  // 1. Gelirleri Aylara Dağıt
  invoices.forEach(inv => {
    if (inv.status === 'PAID') { // Sadece ödenenler gelirdir
      const month = new Date(inv.date).toLocaleString('tr-TR', { month: 'short' });
      if (monthlyData[month]) {
        const total = inv.items.reduce((acc, item) => {
             const line = Number(item.price) * item.quantity
             return acc + line + (line * (item.vatRate/100))
        }, 0);
        monthlyData[month].gelir += total;
      }
    }
  });

  // 2. Giderleri Aylara Dağıt
  expenses.forEach(exp => {
    const month = new Date(exp.date).toLocaleString('tr-TR', { month: 'short' });
    if (monthlyData[month]) {
      monthlyData[month].gider += Number(exp.amount);
    }
  });

  // Grafiğe gidecek son veri dizisi
  const chartData = Object.values(monthlyData);


  // --- GENEL TOPLAMLAR ---
  const totalRevenue = invoices
    .filter(inv => inv.status === 'PAID')
    .reduce((total, inv) => {
      const invTotal = inv.items.reduce((acc, item) => {
        const lineTotal = Number(item.price) * item.quantity
        const tax = lineTotal * (item.vatRate / 100)
        return acc + lineTotal + tax
      }, 0)
      return total + invTotal
    }, 0)

  const pendingAmount = invoices
    .filter(inv => inv.status === 'PENDING')
    .reduce((total, inv) => {
      const invTotal = inv.items.reduce((acc, item) => {
        const lineTotal = Number(item.price) * item.quantity
        const tax = lineTotal * (item.vatRate / 100)
        return acc + lineTotal + tax
      }, 0)
      return total + invTotal
    }, 0)

  const totalExpenses = expenses.reduce((acc, exp) => acc + Number(exp.amount), 0)
  const netProfit = totalRevenue - totalExpenses

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount)
  }

  // Faturaları ters çevir (En yeniden eskiye) tablo için
  const recentInvoices = [...invoices].reverse().slice(0, 5);

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

      {/* --- FİNANSAL KARTLAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Toplam Tahsilat</CardTitle>
            <span className="text-emerald-500 text-xl">💰</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700">{formatCurrency(totalRevenue)}</div>
            <p className="text-xs text-emerald-600/80 mt-1">Kasadaki Para</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Toplam Giderler</CardTitle>
            <span className="text-red-500 text-xl">💸</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-red-600/80 mt-1">Harcamalar</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 shadow-sm ${netProfit >= 0 ? 'border-l-blue-600' : 'border-l-red-600'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Net Kâr</CardTitle>
            <span className="text-xl">📊</span>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-slate-400 mt-1">Cebine Kalan</p>
          </CardContent>
        </Card>
      </div>

      {/* --- OPERASYONEL KARTLAR --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* BEKLEYEN ALACAK */}
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Bekleyen Alacak</CardTitle>
            <span className="text-amber-500 text-xl">⏳</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{formatCurrency(pendingAmount)}</div>
            <p className="text-xs text-slate-400 mt-1">Tahsil edilecek</p>
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
            <CardTitle className="text-sm font-medium text-slate-500">Kesilen Fatura</CardTitle>
            <span className="text-purple-500 text-xl">🧾</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{invoices.length}</div>
            <p className="text-xs text-slate-400 mt-1">Toplam işlem adedi</p>
          </CardContent>
        </Card>
      </div>

      {/* --- GRAFİK ALANI --- */}
      <div className="w-full">
        <OverviewChart data={chartData} />
      </div>

      {/* --- ALT BÖLÜM --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* TABLO */}
        <div className="lg:col-span-2">
           <Card className="h-full border border-slate-200">
             <CardHeader>
               <CardTitle>Son Kesilen Faturalar</CardTitle>
             </CardHeader>
             <CardContent>
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="text-slate-500 bg-slate-50 border-b">
                     <tr>
                       <th className="p-3 font-medium">Müşteri</th>
                       <th className="p-3 font-medium text-right">Tutar</th>
                       <th className="p-3 font-medium text-center">Durum</th>
                     </tr>
                   </thead>
                   <tbody>
                     {recentInvoices.map(inv => {
                        const total = inv.items.reduce((acc, item) => {
                          const line = Number(item.price) * item.quantity
                          return acc + line + (line * (item.vatRate/100))
                        }, 0)

                        return (
                          <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-medium text-slate-700">{inv.customer.name}</td>
                            <td className="p-3 font-bold text-slate-700 text-right">{formatCurrency(total)}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-red-100 text-red-700 border-red-200'
                              }`}>
                                {inv.status === 'PAID' ? 'ÖDENDİ' : inv.status === 'PENDING' ? 'BEKLİYOR' : 'İPTAL'}
                              </span>
                            </td>
                          </tr>
                        )
                     })}
                     {recentInvoices.length === 0 && (
                       <tr><td colSpan={3} className="p-6 text-center text-slate-500">Kayıt yok.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
               
               <div className="pt-4 border-t mt-4 text-center">
                 <Link href="/dashboard/invoices" className="text-blue-600 text-sm font-medium hover:underline flex items-center justify-center gap-1">
                   Tümünü Gör <span>→</span>
                 </Link>
               </div>
             </CardContent>
           </Card>
        </div>

        {/* HIZLI İŞLEMLER */}
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
                    <Link href="/dashboard/customers" className="block group">
                        <div className="p-4 border rounded-lg hover:bg-orange-50 hover:border-orange-200 transition cursor-pointer flex items-center gap-4 bg-white shadow-sm group-hover:shadow-md">
                            <div className="bg-orange-100 p-2 rounded-full text-orange-600 text-xl">👥</div>
                            <div>
                                <div className="font-bold text-slate-700 group-hover:text-orange-700">Müşteri Ekle</div>
                                <div className="text-xs text-slate-500">Yeni cari kart aç</div>
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