import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { deleteCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import Search from "@/components/search"
import { CustomerForm } from "@/components/dashboard/customer-form"
import Pagination from "@/components/pagination" 

const ITEMS_PER_PAGE = 10

export default async function CustomersPage({
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
    OR: [
      { name: { contains: query, mode: "insensitive" as const } },
      { email: { contains: query, mode: "insensitive" as const } },
    ]
  }

  // 3. Toplam Sayıyı Bul
  const totalItems = await prisma.customer.count({
    where: whereCondition
  })
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE)

  // 4. Verileri Çek (Sayfalı)
  const customers = await prisma.customer.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  })

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* --- Ekleme Formu --- */}
      <Card>
        <CardHeader>
          <CardTitle>➕ Yeni Cari Hesap Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomerForm />
        </CardContent>
      </Card>

      {/* --- Liste Tablosu --- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>📋 Müşteri Listesi ({totalItems})</CardTitle>
          <div className="w-full md:w-72">
             <Search placeholder="İsim veya Email ara..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b text-slate-500">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">Adı</th>
                  <th className="p-4 font-medium whitespace-nowrap">İletişim</th>
                  <th className="p-4 font-medium whitespace-nowrap">Türü</th>
                  <th className="p-4 font-medium whitespace-nowrap">Kayıt Tarihi</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      {query ? `"${query}" ile eşleşen kayıt bulunamadı.` : "Henüz hiç kayıt yok."}
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-medium text-slate-700 whitespace-nowrap">
                        {customer.name}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span>{customer.email || "-"}</span>
                          <span className="text-xs text-slate-500">{customer.phone}</span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          customer.type === 'BUYER' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {customer.type === 'BUYER' ? 'Müşteri' : 'Tedarikçi'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 whitespace-nowrap">
                        {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex justify-end items-center gap-2">
                            <Link href={`/dashboard/customers/${customer.id}`}>
                                <Button size="sm" variant="outline">Detay</Button>
                            </Link>

                            <form action={async () => {
                                "use server"
                                await deleteCustomer(customer.id)
                            }}>
                                <Button size="sm" variant="destructive">Sil</Button>
                            </form>
                        </div>
                      </td>
                    </tr>
                  ))
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