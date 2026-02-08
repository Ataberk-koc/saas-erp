import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader,  } from "@/components/ui/card"
import Link from "next/link"
import { redirect } from "next/navigation"
import Search from "@/components/search"
import Pagination from "@/components/pagination"
import { InvoiceType } from "@prisma/client" // Enum'ı import et

const ITEMS_PER_PAGE = 10 

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string; type?: string }> // 👇 'type' eklendi
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // 1. Parametreleri al (Varsayılan: SATIŞ FATURASI)
  const params = await searchParams
  const query = params?.q || ""
  const currentPage = Number(params?.page) || 1
  const typeParam = params?.type === "PURCHASE" ? "PURCHASE" : "SALES"

  // 2. Filtreleme
  const whereCondition = {
    tenantId: user?.tenantId,
    type: typeParam as InvoiceType, // 👇 Tipe göre filtrele
    customer: {
      name: {
        contains: query,
        mode: 'insensitive' as const
      }
    }
  }

  // 3. Verileri Çek
  const totalItems = await prisma.invoice.count({ where: whereCondition })
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  const invoices = await prisma.invoice.findMany({
    where: whereCondition,
    include: {
      customer: true,
      items: true,
    },
    orderBy: { date: 'desc' },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount)
  }

  // Başlık ve Buton Ayarları
  const isPurchase = typeParam === "PURCHASE"
  const pageTitle = isPurchase ? "🛒 Alış Faturaları (Gider)" : "📄 Satış Faturaları (Gelir)"
  const newButtonLink = isPurchase ? "/expenses/new" : "/dashboard/invoices/create"
  const newButtonText = isPurchase ? "+ Alış Fatura Kes" : "+ Satış Fatura Kes"

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* Üst Başlık ve Buton */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-slate-800">{pageTitle}</h1>
           <p className="text-slate-500 mt-1">
             {isPurchase 
               ? "Tedarikçilerden gelen faturaları ve stok girişlerini yönetin." 
               : "Müşterilere kestiğiniz faturaları yönetin."}
           </p>
        </div>
        
        <Link href={newButtonLink} className="w-full md:w-auto">
            <Button className={`w-full md:w-auto gap-2 ${isPurchase ? 'bg-orange-600 hover:bg-orange-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {newButtonText}
            </Button>
        </Link>
      </div>

      {/* Tablo Kartı */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          
          {/* Hızlı Geçiş Sekmeleri (Tabs) */}
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Link href="/dashboard/invoices?type=SALES">
              <div className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${!isPurchase ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Satış Faturaları
              </div>
            </Link>
            <Link href="/dashboard/invoices?type=PURCHASE">
              <div className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${isPurchase ? 'bg-white shadow text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>
                Alış Faturaları
              </div>
            </Link>
          </div>

          <div className="w-full md:w-72">
             <Search placeholder={isPurchase ? "Tedarikçi ara..." : "Müşteri ara..."} />
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b text-slate-500">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">
                    {isPurchase ? "Belge No" : "Fatura No"}
                  </th>
                  {isPurchase && (
                    <th className="p-4 font-medium whitespace-nowrap">GÇB No</th>
                  )}
                  <th className="p-4 font-medium whitespace-nowrap">
                    {isPurchase ? "Tedarikçi" : "Müşteri"}
                  </th>
                  <th className="p-4 font-medium whitespace-nowrap">Tarih</th>
                  <th className="p-4 font-medium whitespace-nowrap">Durum</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">Toplam Tutar</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={isPurchase ? 7 : 6} className="p-8 text-center text-slate-500">
                      {isPurchase ? "Henüz alış faturası girilmemiş." : "Henüz satış faturası kesilmemiş."}
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
                        <td className="p-4 font-medium text-slate-700">
                            {/* Alış ise Belge No, Satış ise Otomatik No */}
                            {isPurchase ? (inv.documentNumber || "-") : `#${inv.number}`}
                        </td>
                        {isPurchase && (
                          <td className="p-4 text-slate-600">
                            {inv.gcbNo || "-"}
                          </td>
                        )}
                        <td className="p-4 font-medium">{inv.customer.name}</td>
                        <td className="p-4 text-slate-500">
                            {new Date(inv.date).toLocaleDateString("tr-TR")}
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${
                              inv.status === 'PAID' ? 'bg-green-100 text-green-700 border-green-200' :
                              inv.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                              'bg-red-100 text-red-700 border-red-200'
                            }`}>
                              {inv.status === 'PAID' ? 'Tamamlandı' : inv.status === 'PENDING' ? 'Bekliyor' : 'İptal'}
                            </span>
                        </td>
                        <td className={`p-4 text-right font-bold whitespace-nowrap ${isPurchase ? 'text-red-600' : 'text-slate-700'}`}>
                            {isPurchase ? "-" : ""}{formatCurrency(totalAmount)}
                        </td>
                        <td className="p-4 text-right whitespace-nowrap">
                            <Link href={`/dashboard/invoices/${inv.id}`}>
                                <Button variant="ghost" size="sm">Detay</Button>
                            </Link>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <Pagination totalPages={totalPages} />
          </div>

        </CardContent>
      </Card>
    </div>
  )
}