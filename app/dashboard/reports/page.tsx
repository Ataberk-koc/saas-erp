import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarDateRangePicker } from "@/components/dashboard/date-range-picker"
import { TrendingUp, TrendingDown, Wallet } from "lucide-react"

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string; to?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // 1. Tarihleri Ayarla (Varsayılan: Bu Ay)
  const params = await searchParams
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  
  const from = params?.from ? new Date(params.from) : firstDayOfMonth
  const to = params?.to ? new Date(params.to) : now

  // Saat ayarı yapalım ki o günün tamamını kapsasın (00:00 -> 23:59)
  const startDate = new Date(from.setHours(0, 0, 0, 0))
  const endDate = new Date(to.setHours(23, 59, 59, 999))

  // 2. Verileri Çek (Filtreli)
  // A. Gelir Hesabı (Detaylı):
  const paidInvoices = await prisma.invoice.findMany({
     where: {
        tenantId: user?.tenantId,
        status: "PAID",
        date: { gte: startDate, lte: endDate }
     },
     include: { items: true }
  })

  // JS ile Toplama (Fiyat * Adet)
  const totalIncome = paidInvoices.reduce((acc, inv) => {
    const invTotal = inv.items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0)
    return acc + invTotal
  }, 0)


  // B. Giderler
  const expenseResult = await prisma.expense.aggregate({
    where: {
      tenantId: user?.tenantId,
      date: {
        gte: startDate, lte: endDate,
      },
    },
    _sum: {
      amount: true,
    },
  })

  const totalExpense = Number(expenseResult._sum.amount || 0)
  const netProfit = totalIncome - totalExpense

  // Formatlayıcı
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount)
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      {/* Başlık ve Filtre */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h1 className="text-3xl font-bold text-slate-800">Finansal Raporlar</h1>
            <p className="text-slate-500">
                {startDate.toLocaleDateString("tr-TR")} - {endDate.toLocaleDateString("tr-TR")} arası veriler
            </p>
        </div>
        <div className="flex items-center gap-2">
            <CalendarDateRangePicker />
        </div>
      </div>

      {/* Kartlar */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* GELİR KARTI */}
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gelir</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totalIncome)}
            </div>
            <p className="text-xs text-muted-foreground">Seçili tarih aralığındaki tahsilatlar</p>
          </CardContent>
        </Card>

        {/* GİDER KARTI */}
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Gider</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground">Seçili tarih aralığındaki harcamalar</p>
          </CardContent>
        </Card>

        {/* NET KAR KARTI */}
        <Card className={`border-l-4 shadow-sm ${netProfit >= 0 ? 'border-l-blue-500' : 'border-l-orange-500'}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Kâr / Zarar</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">Gelir - Gider</p>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}