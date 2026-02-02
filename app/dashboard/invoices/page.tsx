import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import Search from "@/components/search"
import Pagination from "@/components/pagination" // 👈 YENİ BİLEŞEN

const ITEMS_PER_PAGE = 10 // Her sayfada kaç fatura görünsün?

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // 1. Parametreleri al
  const params = await searchParams
  const query = params?.q || ""
  const currentPage = Number(params?.page) || 1

  // 2. Filtreleme Koşulları
  const whereCondition = {
    tenantId: user?.tenantId,
    customer: {
      name: {
        contains: query,
        mode: 'insensitive' as const
      }
    }
  }

  // 3. Toplam Sayıyı Bul (Sayfalama hesabı için)
  const totalItems = await prisma.invoice.count({
    where: whereCondition
  })
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // 4. Verileri Çek (Sadece o sayfanın verisi)
  const invoices = await prisma.invoice.findMany({
    where: whereCondition,
    include: {
      customer: true,
      items: true,
    },
    orderBy: { date: 'desc' },
    skip: (currentPage - 1) * ITEMS_PER_PAGE, // Kaç tane atlayayım?
    take: ITEMS_PER_PAGE, // Kaç tane alayım?
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount)
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800">📄 Faturalar</h1>
        <Link href="/dashboard/invoices/create" className="w-full md:w-auto">
            <Button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
                + Yeni Fatura Kes
            </Button>
        </Link>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>Kesilen Faturalar ({totalItems})</CardTitle>
          <div className="w-full md:w-72">
             <Search placeholder="Müşteri adı ara..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b text-slate-500">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">Fatura No</th>
                  <th className="p-4 font-medium whitespace-nowrap">Müşteri</th>
                  <th className="p-4 font-medium whitespace-nowrap">Tarih</th>
                  <th className="p-4 font-medium whitespace-nowrap">Durum</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">Toplam Tutar</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-500">
                      {query ? `"${query}" ile eşleşen kayıt bulunamadı.` : "Henüz fatura kesilmemiş."}
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const totalAmount = inv.items.reduce((acc, item) => {
                        const lineTotal = Number(item.price) * item.quantity
                        const tax = lineTotal * (item.vatRate / 100)
                        return acc + lineTotal + tax
                    }, 0)

                    return (
                      <tr key={inv.id} className="border-b hover:bg-slate-50 transition-colors">
                        <td className="p-4 font-medium text-slate-700 whitespace-nowrap">#{inv.number}</td>
                        <td className="p-4 font-medium whitespace-nowrap">{inv.customer.name}</td>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                            {new Date(inv.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                              inv.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                              inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {inv.status === 'PAID' ? 'Ödendi' : inv.status === 'PENDING' ? 'Bekliyor' : 'İptal'}
                            </span>
                        </td>
                        <td className="p-4 text-right font-bold text-slate-700 whitespace-nowrap">
                            {formatCurrency(totalAmount)}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                            <Link href={`/dashboard/invoices/${inv.id}`}>
                                <Button variant="outline" size="sm">Detay →</Button>
                            </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 👇 SAYFALAMA BİLEŞENİ BURAYA EKLENDİ */}
          <div className="mt-4">
            <Pagination totalPages={totalPages} />
          </div>

        </CardContent>
      </Card>
    </div>
  )
}