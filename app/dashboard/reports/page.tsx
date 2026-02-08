import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ProductReportView } from "@/components/dashboard/product-report-view"

export default async function ReportsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Dropdown için sadece ürün listesini çekiyoruz
  const products = await prisma.product.findMany({
    where: { tenantId: user?.tenantId },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  })

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">📊 Ürün Raporları</h1>
        <p className="text-slate-500">
          Ürün bazında kârlılık, stok hareketi ve alış/satış geçmişini detaylı inceleyin.
        </p>
      </div>

      {/* Client Component'i buraya yerleştiriyoruz */}
      <ProductReportView products={products} />
    </div>
  )
}