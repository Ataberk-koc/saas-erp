import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect, notFound } from "next/navigation"
import { EditProductForm } from "@/components/dashboard/edit-product-form" // 👈 Yeni bileşeni çağırıyoruz

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  // Next.js 15+ için params await edilmeli
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Düzenlenecek ürünü bul
  const product = await prisma.product.findUnique({
    where: { 
        id: id,
        tenantId: user?.tenantId
    },
  })

  if (!product) notFound()

  // Veriyi Client Component'e uygun hale getir (Decimal -> Number)
  const productData = {
    ...product,
    price: Number(product.price),
    buyPrice: Number(product.buyPrice),
    exchangeRate: Number(product.exchangeRate),
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen flex justify-center items-start">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>✏️ Ürünü Düzenle</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Form Bileşeni */}
          <EditProductForm product={productData} />
        </CardContent>
      </Card>
    </div>
  )
}