import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { deleteCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import Search from "@/components/search"
import { CustomerForm } from "@/components/dashboard/customer-form" // 👈 Yeni bileşen

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Arama kelimesini al
  const params = await searchParams
  const query = params?.q || ""

  // Müşterileri Çek
  const customers = await prisma.customer.findMany({
    where: {
      tenantId: user?.tenantId,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
      ]
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* --- Ekleme Formu (Client Component) --- */}
      <Card>
        <CardHeader>
          <CardTitle>➕ Yeni Cari Hesap Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          {/* 👇 Artık burada yeni güvenli formumuz var */}
          <CustomerForm />
        </CardContent>
      </Card>

      {/* --- Liste Tablosu --- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>📋 Müşteri Listesi ({customers.length})</CardTitle>
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
        </CardContent>
      </Card>

    </div>
  )
}