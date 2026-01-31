import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { InvoiceForm } from "@/components/dashboard/invoice-form";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // 1. Faturayı, Müşterileri ve Ürünleri Çek
  const [invoice, customers, products] = await Promise.all([
    prisma.invoice.findUnique({
      where: { 
        id: id,
        tenantId: user?.tenantId 
      },
      include: { items: true }, // Kalemleri de çekiyoruz
    }),
    prisma.customer.findMany({
      where: { tenantId: user?.tenantId },
      orderBy: { name: "asc" },
    }),
    prisma.product.findMany({
      where: { tenantId: user?.tenantId },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!invoice) notFound();

  // 🛠️ Decimal verileri Number'a çeviriyoruz (Form'a gönderirken hata almamak için)
  // InvoiceForm bileşeni "number" bekliyor, Prisma "Decimal" veriyor.
  const serializedInvoice = {
    id: invoice.id,
    customerId: invoice.customerId,
    date: invoice.date,
    items: invoice.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.price), // Decimal -> Number çevrimi
      vatRate: item.vatRate,
    })),
  };

  const serializedProducts = products.map(p => ({
    ...p,
    price: Number(p.price)
  }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Faturayı Düzenle</h1>
        <span className="text-sm text-slate-500">#{invoice.number}</span>
      </div>

      {/* initialData gönderiyoruz, böylece form "Düzenleme Modu"nda açılacak */}
      <InvoiceForm 
        customers={customers} 
        products={serializedProducts} 
        initialData={serializedInvoice} 
      />
    </div>
  );
}