import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")
  
  // Next.js 15 uyumluluğu için await kullanıyoruz
  const { id } = await params

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      logs: {
        orderBy: { createdAt: 'desc' } // En yeniden eskiye sırala
      }
    }
  })

  if (!product) notFound()

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      {/* Üst Bar */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/products">
            <Button variant="outline" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 break-all">{product.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Sol Taraf: Özet Kartı */}
        <Card className="md:col-span-1 h-fit shadow-sm">
            <CardHeader><CardTitle>📦 Ürün Bilgileri</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Güncel Stok</span>
                    <span className={`font-bold text-lg ${product.stock > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {product.stock} Adet
                    </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Birim Fiyat</span>
                    <span className="font-medium">
                        {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(product.price))}
                    </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">KDV Oranı</span>
                    <span className="font-medium">%{product.vatRate}</span>
                </div>
                
                <div className="pt-4">
                    <Link href={`/dashboard/products/${product.id}/edit`}>
                        <Button className="w-full" variant="outline">✏️ Bilgileri Düzenle</Button>
                    </Link>
                </div>
            </CardContent>
        </Card>

        {/* Sağ Taraf: Geçmiş Tablosu */}
        <Card className="md:col-span-2 shadow-sm">
            <CardHeader><CardTitle>📜 Hareket Kayıtları (Loglar)</CardTitle></CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 border-b text-slate-500">
                            <tr>
                                <th className="p-3 whitespace-nowrap">Tarih</th>
                                <th className="p-3 whitespace-nowrap">İşlem</th>
                                <th className="p-3 text-right whitespace-nowrap">Değişim</th>
                                <th className="p-3 text-right whitespace-nowrap">Kalan</th>
                                <th className="p-3 min-w-[150px]">Açıklama</th>
                            </tr>
                        </thead>
                        <tbody>
                            {product.logs.length === 0 ? (
                                <tr><td colSpan={5} className="p-6 text-center text-slate-500">Henüz bu üründe bir hareket yok.</td></tr>
                            ) : (
                                product.logs.map(log => (
                                    <tr key={log.id} className="border-b hover:bg-slate-50 last:border-0">
                                        <td className="p-3 text-slate-500 whitespace-nowrap">
                                            {new Date(log.createdAt).toLocaleString('tr-TR')}
                                        </td>
                                        <td className="p-3 whitespace-nowrap">
                                            <Badge variant={
                                                log.type === 'SALE' ? 'destructive' : 
                                                log.type === 'ADJUSTMENT' ? 'secondary' : 
                                                log.type === 'CANCEL' ? 'outline' : 'default'
                                            } className={
                                                log.type === 'SALE' ? 'bg-red-100 text-red-700 hover:bg-red-200 border-0' :
                                                log.type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0' : ''
                                            }>
                                                {log.type === 'SALE' ? 'SATIŞ' : 
                                                 log.type === 'CANCEL' ? 'İPTAL/İADE' : 
                                                 log.type === 'ADJUSTMENT' ? 'DÜZELTME' : 'ALIM'}
                                            </Badge>
                                        </td>
                                        <td className={`p-3 text-right font-bold whitespace-nowrap ${log.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {log.change > 0 ? `+${log.change}` : log.change}
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-700 whitespace-nowrap">
                                            {log.newStock}
                                        </td>
                                        <td className="p-3 text-slate-600 text-xs">
                                            {log.note}
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
    </div>
  )
}