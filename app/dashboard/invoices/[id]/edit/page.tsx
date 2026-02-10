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
      include: { 
        items: true,      // Kalemleri çek
        payments: true    // Ödemeleri çek
      }, 
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

  // 🛠️ DÖNÜŞTÜRME İŞLEMİ (Serialization)
  // Veritabanı formatını -> Form formatına çeviriyoruz.
  const serializedInvoice = {
    id: invoice.id,
    customerId: invoice.customerId,
    date: invoice.date, // Form hem Date hem string kabul ediyor, bu kalabilir.
    type: invoice.type, 
    items: invoice.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(item.price), // Decimal -> Number
      vatRate: item.vatRate,
    })),
    // 🔴 HATA BURADAYDI, ŞİMDİ DÜZELTİLDİ:
    payments: invoice.payments.map((p) => ({
      amount: Number(p.amount),   // Decimal -> Number
      date: p.date.toISOString(), // Date -> String (ISO format)
      note: p.note || ""          // null -> Boş String ("")
    })),
  };

  // Ürünleri de serialize ediyoruz
  const serializedProducts = products.map(p => ({
    ...p,
    price: Number(p.price),
    buyPrice: Number(p.buyPrice),
    exchangeRate: Number(p.exchangeRate),
    stock: p.stock
  }));

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Faturayı Düzenle</h1>
        <span className="text-sm text-slate-500">#{invoice.number}</span>
      </div>

      <InvoiceForm 
        customers={customers} 
        products={serializedProducts} 
        initialData={serializedInvoice} 
      />
    </div>
  );
}