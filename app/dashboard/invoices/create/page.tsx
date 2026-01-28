// app/dashboard/invoices/create/page.tsx
import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import CreateInvoiceForm from "./form"

export default async function CreateInvoicePage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Müşterileri Çek
  const customers = await prisma.customer.findMany({
    where: { tenantId: user?.tenantId },
  })

  // Ürünleri Çek
  const productsRaw = await prisma.product.findMany({
    where: { tenantId: user?.tenantId },
  })

  // 👇 DÜZELTME: Prisma'nın "Decimal" fiyatını "Number"a çeviriyoruz
  // Böylece form.tsx içindeki "price: number" kuralına uyuyoruz.
  const products = productsRaw.map((product) => ({
    ...product,
    price: Number(product.price), // Decimal -> Number dönüşümü
  }))

  return (
    <div className="p-10 bg-slate-50 min-h-screen flex justify-center">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>🧾 Yeni Fatura Kes</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateInvoiceForm customers={customers} products={products} />
        </CardContent>
      </Card>
    </div>
  )
}