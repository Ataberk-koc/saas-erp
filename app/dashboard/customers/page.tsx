import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { addCustomer, deleteCustomer } from "@/app/actions/customer" // 👈 deleteCustomer eklendi
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import Link from "next/link"
import Search from "@/components/search"

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

  async function handleSave(formData: FormData) {
    "use server"
    await addCustomer(formData)
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* --- Ekleme Formu --- */}
      <Card>
        <CardHeader>
          <CardTitle>➕ Yeni Cari Hesap Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={handleSave} className="flex flex-col md:flex-row gap-4 items-end">
            
            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Firma/Kişi Adı</label>
              <Input name="name" placeholder="Örn: Ahmet Yılmaz A.Ş." required />
            </div>
            
            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input name="email" placeholder="ahmet@mail.com" />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Telefon</label>
              <Input name="phone" placeholder="0555..." />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Türü</label>
              <select 
                name="type" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              >
                <option value="BUYER">Müşteri (Alıcı)</option>
                <option value="SUPPLIER">Tedarikçi (Satıcı)</option>
              </select>
            </div>

            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Kaydet</Button>
          </form>
        </CardContent>
      </Card>

      {/* --- Liste Tablosu --- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>📋 Müşteri Listesi ({customers.length})</CardTitle>
          <div className="w-72">
             <Search placeholder="İsim veya Email ara..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b text-slate-500">
                <tr>
                  <th className="p-4 font-medium">Adı</th>
                  <th className="p-4 font-medium">İletişim</th>
                  <th className="p-4 font-medium">Türü</th>
                  <th className="p-4 font-medium">Kayıt Tarihi</th>
                  {/* 👇 YENİ SÜTUN */}
                  <th className="p-4 font-medium text-right">İşlemler</th>
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
                      
                      <td className="p-4 font-medium text-slate-700">
                        {customer.name}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col">
                          <span>{customer.email || "-"}</span>
                          <span className="text-xs text-slate-500">{customer.phone}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          customer.type === 'BUYER' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-orange-100 text-orange-700'
                        }`}>
                          {customer.type === 'BUYER' ? 'Müşteri' : 'Tedarikçi'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                      
                      {/* 👇 YENİ: İŞLEMLER BUTONLARI */}
                      <td className="p-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                            {/* Detay Butonu */}
                            <Link href={`/dashboard/customers/${customer.id}`}>
                                <Button size="sm" variant="outline">Detay</Button>
                            </Link>

                            {/* Sil Butonu (Form içinde olmalı) */}
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