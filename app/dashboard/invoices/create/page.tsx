import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
// ❌ import CreateInvoiceForm from "./form" <-- Bunu kaldırdık, çünkü hata buna bağlı
import { InvoiceForm } from "@/components/dashboard/invoice-form"; // ✅ Bunu kullanıyoruz

export default async function CreateInvoicePage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Müşterileri Çek (Alfabetik sırayla)
  const customers = await prisma.customer.findMany({
    where: { tenantId: user?.tenantId },
    orderBy: { name: 'asc' }
  })

  // Ürünleri Çek
  const productsRaw = await prisma.product.findMany({
    where: { tenantId: user?.tenantId },
    orderBy: { name: 'asc' }
  })

  // Prisma Decimal -> Number dönüşümü
  const products = productsRaw.map((product) => ({
    ...product,
    price: Number(product.price),
  }))

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
       <h1 className="text-3xl font-bold mb-8 text-slate-800">🧾 Yeni Fatura Kes</h1>
       
       {/* Eski <CreateInvoiceForm /> yerine yeni bileşeni koyuyoruz.
          Yeni bileşenin kendi içinde Card tasarımı olduğu için 
          dışarıdaki Card sarmalayıcısını kaldırdık (Çift çerçeve olmasın diye).
       */}
       <InvoiceForm customers={customers} products={products} />
    </div>
  )
}