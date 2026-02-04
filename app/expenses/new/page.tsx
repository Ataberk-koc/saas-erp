import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import PurchaseForm from "./form" // 👇 Birazdan oluşturacağımız form dosyası

export default async function NewExpensePage() {
  const session = await auth()
  if (!session?.user?.email) return redirect("/login")

  // 1. Kullanıcının şirketini bul
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { tenantId: true }
  })

  if (!user?.tenantId) return redirect("/dashboard")

  // 2. SADECE bu şirkete ait Carileri (Tedarikçi/Müşteri) çek
  // İstersen sadece "SUPPLIER" olanları çekebilirsin, şimdilik hepsini getiriyorum.
  const customers = await prisma.customer.findMany({
    where: { 
      tenantId: user.tenantId 
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true } // Sadece lazım olanları al
  })

  // 3. Formu render et ve carileri gönder
  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Yeni Alış Faturası (Gider)</h1>
        <p className="text-gray-500">Tedarikçiden aldığınız ürünleri stoklarınıza ekleyin.</p>
      </div>
      
      <PurchaseForm customers={customers} />
    </div>
  )
}