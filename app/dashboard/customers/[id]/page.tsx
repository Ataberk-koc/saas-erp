import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true },
  })

  // Müşteriyi ve Faturalarını (Ürünleriyle beraber) Çekiyoruz
  const customer = await prisma.customer.findUnique({
    where: {
      id: id,
      tenantId: user?.tenantId,
    },
    include: {
      invoices: {
        include: { items: true }, // Fiyat hesabı için kalemler lazım
        orderBy: { date: 'desc' } // En yeni fatura en üstte
      },
    },
  })

  if (!customer) notFound()

  // --- HESAPLAMALAR ---
  
  // 1. Toplam Ciro Hesabı (Vergiler Dahil)
  const totalRevenue = customer.invoices.reduce((total, inv) => {
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

  // Telefon numarasını temizleyip WhatsApp linki oluşturma
  const cleanPhone = customer.phone?.replace(/[^0-9]/g, "")
  const whatsappLink = cleanPhone ? `https://wa.me/90${cleanPhone}` : "#"

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* Üst Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
            <Link href="/dashboard/customers">
                <Button variant="outline">← Geri</Button>
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">{customer.name}</h1>
        </div>
        
        {/* Eğer telefon varsa WhatsApp butonu göster */}
        {customer.phone && (
            <a href={whatsappLink} target="_blank" rel="noreferrer">
                <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                    <span>💬  &apos;WhatsApp&apos;tan Yaz</span>
                </Button>
            </a>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Sol Taraf: Müşteri Kartı */}
        <Card className="md:col-span-1 h-fit">
            <CardHeader className="bg-slate-100 border-b">
                <CardTitle className="text-lg">👤 Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
                <div>
                    <span className="text-xs text-slate-500 font-bold uppercase">E-Posta</span>
                    <p className="text-slate-700">{customer.email || "-"}</p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 font-bold uppercase">Telefon</span>
                    <p className="text-slate-700">{customer.phone || "-"}</p>
                </div>
                <div>
                    <span className="text-xs text-slate-500 font-bold uppercase">Adres</span>
                    <p className="text-slate-700">{customer.address || "-"}</p>
                </div>
            </CardContent>
        </Card>

        {/* Sağ Taraf: İstatistik ve Geçmiş */}
        <div className="md:col-span-2 space-y-6">
            
            {/* Özet Kartları */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">Toplam Ciro</p>
                        <h3 className="text-2xl font-bold text-green-600 mt-1">
                            {formatCurrency(totalRevenue)}
                        </h3>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-slate-500">Kesilen Fatura</p>
                        <h3 className="text-2xl font-bold text-slate-800 mt-1">
                            {customer.invoices.length} Adet
                        </h3>
                    </CardContent>
                </Card>
            </div>

            {/* Fatura Geçmişi Tablosu */}
            <Card>
                <CardHeader>
                    <CardTitle>📄 Fatura Geçmişi</CardTitle>
                </CardHeader>
                <CardContent>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3">Fatura No</th>
                                <th className="p-3">Tarih</th>
                                <th className="p-3 text-right">Tutar</th>
                                <th className="p-3 text-center">Durum</th>
                                <th className="p-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {customer.invoices.length === 0 ? (
                                <tr><td colSpan={5} className="p-4 text-center text-slate-500">Fatura bulunamadı.</td></tr>
                            ) : (
                                customer.invoices.map(inv => {
                                    // Her faturanın kendi toplamını hesapla
                                    const invTotal = inv.items.reduce((acc, item) => {
                                        const total = Number(item.price) * item.quantity
                                        return acc + total + (total * (item.vatRate / 100))
                                    }, 0)

                                    return (
                                        <tr key={inv.id} className="border-b hover:bg-slate-50">
                                            <td className="p-3 font-medium">#{inv.number}</td>
                                            <td className="p-3 text-slate-500">
                                                {new Date(inv.date).toLocaleDateString("tr-TR")}
                                            </td>
                                            <td className="p-3 text-right font-bold text-slate-700">
                                                {formatCurrency(invTotal)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${
                                                  inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                  inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                  'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                  {inv.status === 'PAID' ? 'ÖDENDİ' : inv.status === 'PENDING' ? 'BEKLİYOR' : 'İPTAL'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-right">
                                                <Link href={`/dashboard/invoices/${inv.id}`} className="text-blue-600 hover:underline text-xs">
                                                    Detay →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  )
}