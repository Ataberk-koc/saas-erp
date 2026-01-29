// app/dashboard/invoices/[id]/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import PrintButton from "./print-button";
import StatusButtons from "./status-button";
import DeleteButton from "./delete-button"; 
import DownloadButton from "./download-button";

// Yazdırma Stili
const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #invoice-area, #invoice-area * { visibility: visible; }
    #invoice-area {
      position: absolute;
      left: 0; top: 0; width: 100%;
      margin: 0; padding: 0;
      box-shadow: none; border: none;
    }
    @page { size: auto; margin: 0mm; }
  }
`;

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true },
  });

  const invoice = await prisma.invoice.findUnique({
    where: {
      id: id,
      tenantId: user?.tenantId,
    },
    include: {
      customer: true,
      items: {
        include: { product: true },
      },
    },
  });

  if (!invoice) notFound();

  // --- HESAPLAMALAR ---
  const subTotal = invoice.items.reduce((acc, item) => {
    return acc + Number(item.price) * item.quantity;
  }, 0);

  const totalTaxAmount = invoice.items.reduce((acc, item) => {
    const itemTotal = Number(item.price) * item.quantity;
    const itemTax = itemTotal * (item.vatRate / 100);
    return acc + itemTax;
  }, 0);

  const grandTotal = subTotal + totalTaxAmount;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  return (
    <div className="p-8 bg-slate-100 min-h-screen flex flex-col items-center gap-6">
      <style>{printStyles}</style>

      {/* ÜST BUTONLAR VE AKSİYONLAR */}
      <div className="w-full max-w-4xl flex justify-between items-center no-print">
        <Link href="/dashboard/invoices">
          <Button variant="outline">← Listeye Dön</Button>
        </Link>
        
        <div className="flex gap-2">
            {/* 👇 YENİ: Durum Değiştirme Butonları Burada */}
            <StatusButtons id={invoice.id} currentStatus={invoice.status} />
            
            <PrintButton />
            <DeleteButton invoiceId={invoice.id} />
            <DownloadButton invoice={invoice} tenant={user?.tenant} />
        </div>
      </div>

      {/* FATURA KAĞIDI */}
      <div
        id="invoice-area"
        // 👇 relative ve overflow-hidden ekledik (Damga taşmasın diye)
        className="bg-white w-full max-w-4xl p-12 shadow-xl rounded-lg text-slate-800 relative overflow-hidden"
        style={{ minHeight: "297mm" }}
      >
        
        {/* 👇 YENİ: Durum Damgası (Watermark) */}
        <div className="absolute top-10 right-10 opacity-20 transform rotate-12 pointer-events-none">
            {invoice.status === 'PAID' && (
                <span className="border-4 border-green-600 text-green-600 text-6xl font-black px-4 py-2 rounded uppercase">
                    ÖDENDİ
                </span>
            )}
            {invoice.status === 'CANCELLED' && (
                <span className="border-4 border-red-600 text-red-600 text-6xl font-black px-4 py-2 rounded uppercase">
                    İPTAL
                </span>
            )}
        </div>

        {/* 1. Başlık (Şirket Bilgileri) */}
        <div className="flex justify-between items-start border-b pb-8 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user?.tenant?.name}
            </h1>
            
            {/* Şirket Detayları */}
            <div className="text-sm text-slate-500 mt-2 space-y-1">
                <p>Vergi Dairesi: {user?.tenant?.taxOffice || "-"}</p>
                <p>Vergi No: {user?.tenant?.taxNumber || "-"}</p>
                
                {/* İletişim Bilgileri */}
                {user?.tenant?.phone && <p>Tel: {user?.tenant?.phone}</p>}
                {user?.tenant?.email && <p>Email: {user?.tenant?.email}</p>}
                {user?.tenant?.website && <p>Web: {user?.tenant?.website}</p>}
                
                <p className="max-w-xs pt-1 border-t mt-1">
                  {user?.tenant?.address || "Adres bilgisi girilmemiş."}
                </p>
            </div>
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-bold text-slate-200">FATURA</h2>
            <p className="mt-2 font-medium">No: #{invoice.number}</p>
            <p className="text-sm text-slate-500">
              {new Date(invoice.date).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>

        {/* 2. Müşteri Bilgileri */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Sayın
          </h3>
          <p className="text-xl font-bold">{invoice.customer.name}</p>
          <p className="text-slate-600">{invoice.customer.email}</p>
          <p className="text-slate-600">{invoice.customer.phone}</p>
        </div>

        {/* 3. Tablo */}
        <table className="w-full mb-10">
          <thead className="bg-slate-50 border-b border-t">
            <tr>
              <th className="text-left py-3 px-4 font-semibold text-sm">Ürün / Hizmet</th>
              <th className="text-center py-3 px-4 font-semibold text-sm">KDV</th>
              <th className="text-center py-3 px-4 font-semibold text-sm">Miktar</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Birim Fiyat</th>
              <th className="text-right py-3 px-4 font-semibold text-sm">Toplam</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b text-sm">
                <td className="py-4 px-4 font-medium">{item.product.name}</td>
                <td className="py-4 px-4 text-center text-slate-500">%{item.vatRate}</td>
                <td className="py-4 px-4 text-center">{item.quantity}</td>
                <td className="py-4 px-4 text-right">
                  {formatCurrency(Number(item.price))}
                </td>
                <td className="py-4 px-4 text-right font-medium">
                  {formatCurrency(Number(item.price) * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 4. Toplamlar */}
        <div className="flex justify-end mb-12">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara Toplam:</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Toplam KDV:</span>
              <span className="font-medium">{formatCurrency(totalTaxAmount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold text-lg">Genel Toplam:</span>
              <span className="font-bold text-lg text-green-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Alt Bilgi (Banka ve İmza) */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t mt-auto">
            
            {/* Banka Bilgileri */}
            <div>
                <h4 className="font-bold text-sm mb-2 text-slate-800">Banka Bilgileri</h4>
                {user?.tenant?.iban ? (
                    <div className="bg-slate-50 p-3 rounded border border-slate-100 inline-block">
                        <p className="text-xs text-slate-500 font-bold mb-1">IBAN:</p>
                        <p className="text-sm font-mono text-slate-700 tracking-wide">{user?.tenant?.iban}</p>
                    </div>
                ) : (
                    <p className="text-xs text-slate-400">IBAN bilgisi girilmemiş.</p>
                )}
            </div>

            {/* İmza Alanı */}
            <div className="text-center mt-4">
                <div className="border-b w-32 mx-auto mb-2"></div>
                <p className="text-xs text-slate-400">İmza / Kaşe</p>
            </div>
        </div>

      </div>
    </div>
  );
}