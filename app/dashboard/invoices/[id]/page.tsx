import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit } from "lucide-react";

// Bileşen Importları
import PrintButton from "./print-button";
import StatusButton from "./status-button"; // İsim düzeltildi
import DeleteButton from "./delete-button";
import DownloadButton from "./download-button";
import SendMailButton from "./send-mail-button";
import { PaymentDetailButton } from "./payment-detail-button";

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
    .no-print { display: none !important; }
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

  // 1. Faturayı, Müşteriyi, Kalemleri ve ÖDEMELERİ Çek
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
      payments: {
        orderBy: { date: 'desc' }
      }
    },
  });

  if (!invoice) notFound();

  // 2. HESAPLAMALAR
  const subTotal = invoice.items.reduce((acc, item) => {
    return acc + Number(item.price) * item.quantity;
  }, 0);

  const totalTaxAmount = invoice.items.reduce((acc, item) => {
    const itemTotal = Number(item.price) * item.quantity;
    const itemTax = itemTotal * (item.vatRate / 100);
    return acc + itemTax;
  }, 0);

  const grandTotal = subTotal + totalTaxAmount;

  // 3. VERİ DÖNÜŞTÜRME (Serialization)
  const serializedInvoice = {
    ...invoice,
    exchangeRate: Number(invoice.exchangeRate),
    items: invoice.items.map((item) => ({
      ...item,
      price: Number(item.price),
      purchasePrice: Number(item.purchasePrice),
      profit: Number(item.profit),
      product: {
        ...item.product,
        price: Number(item.product.price),
        buyPrice: Number(item.product.buyPrice),
      },
    })),
    payments: invoice.payments.map(p => ({
      ...p,
      amount: Number(p.amount),
    })),
  };

  const serializedPayments = invoice.payments.map(p => ({
    id: p.id,
    amount: Number(p.amount),
    date: p.date,
    note: p.note
  }));

  // Para Formatı Yardımcısı
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "TRY",
    }).format(amount);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-100 min-h-screen flex flex-col items-center gap-6">
      <style>{printStyles}</style>

      {/* ÜST BUTONLAR (TOOLBAR) */}
      <div className="w-full max-w-4xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div className="flex items-center gap-2">
            <Link href="/dashboard/invoices">
                <Button variant="outline" size="sm" className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Listeye Dön
                </Button>
            </Link>
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Ödeme Detayı Butonu */}
          <PaymentDetailButton 
            invoiceId={invoice.id} 
            totalAmount={grandTotal} 
            payments={serializedPayments}
            currency={invoice.currency}
            exchangeRate={Number(invoice.exchangeRate)}
          />
          
          <SendMailButton invoiceId={invoice.id} />
          
          <DownloadButton invoice={serializedInvoice} tenant={user?.tenant} />
          
          <PrintButton />
          
          {/* 👇 HATA BURADAYDI, DÜZELTİLDİ: status -> currentStatus */}
          <StatusButton id={invoice.id} currentStatus={invoice.status} />
          
          <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
            <Button
              variant="outline"
              className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200 gap-2"
            >
              <Edit className="h-4 w-4" /> Düzenle
            </Button>
          </Link>

          <DeleteButton invoiceId={invoice.id} />
        </div>
      </div>

      {/* FATURA KAĞIDI */}
      <div
        id="invoice-area"
        className="bg-white w-full max-w-4xl p-6 md:p-12 shadow-xl rounded-lg text-slate-800 relative overflow-hidden"
        style={{ minHeight: "297mm" }}
      >
        {/* Durum Damgası */}
        <div className="absolute top-10 right-10 opacity-20 transform rotate-12 pointer-events-none">
          {invoice.status === "PAID" && (
            <span className="border-4 border-green-600 text-green-600 text-4xl md:text-6xl font-black px-4 py-2 rounded uppercase">
              ÖDENDİ
            </span>
          )}
          {invoice.status === "CANCELLED" && (
            <span className="border-4 border-red-600 text-red-600 text-4xl md:text-6xl font-black px-4 py-2 rounded uppercase">
              İPTAL
            </span>
          )}
        </div>

        {/* 1. Başlık */}
        <div className="flex flex-col md:flex-row justify-between items-start border-b pb-8 mb-8 gap-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 wrap-break-word">
              {user?.tenant?.name}
            </h1>
            <div className="text-sm text-slate-500 mt-2 space-y-1">
              <p>Vergi Dairesi: {user?.tenant?.taxOffice || "-"}</p>
              <p>Vergi No: {user?.tenant?.taxNumber || "-"}</p>
              {user?.tenant?.phone && <p>Tel: {user?.tenant?.phone}</p>}
              {user?.tenant?.email && <p>Email: {user?.tenant?.email}</p>}
              <p className="max-w-xs pt-1 border-t mt-1">
                {user?.tenant?.address || "Adres bilgisi girilmemiş."}
              </p>
            </div>
          </div>
          <div className="text-left md:text-right w-full md:w-auto">
            <h2 className="text-4xl font-bold text-slate-200">FATURA</h2>
            <p className="mt-2 font-medium">No: #{invoice.number}</p>
            {invoice.documentNumber && (
              <p className="text-sm text-slate-500">Belge No: {invoice.documentNumber}</p>
            )}
            {invoice.gcbNo && (
              <p className="text-sm text-slate-500">GÇB No: {invoice.gcbNo}</p>
            )}
            <p className="text-sm text-slate-500">
              {new Date(invoice.date).toLocaleDateString("tr-TR")}
            </p>
          </div>
        </div>

        {/* 2. Müşteri */}
        <div className="mb-10">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Sayın
          </h3>
          <p className="text-xl font-bold">{invoice.customer.name}</p>
          <p className="text-slate-600">{invoice.customer.email}</p>
          <p className="text-slate-600">{invoice.customer.phone}</p>
        </div>

        {/* 3. Tablo */}
        <div className="overflow-x-auto mb-10">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-t">
              <tr>
                <th className="text-left py-3 px-4 font-semibold text-sm whitespace-nowrap">
                  Ürün / Hizmet
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm whitespace-nowrap">
                  KDV
                </th>
                <th className="text-center py-3 px-4 font-semibold text-sm whitespace-nowrap">
                  Miktar
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm whitespace-nowrap">
                  Birim Fiyat
                </th>
                <th className="text-right py-3 px-4 font-semibold text-sm whitespace-nowrap">
                  Toplam
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => (
                <tr key={item.id} className="border-b text-sm">
                  <td className="py-4 px-4 font-medium whitespace-nowrap">
                    {item.product.name}
                  </td>
                  <td className="py-4 px-4 text-center text-slate-500 whitespace-nowrap">
                    %{item.vatRate}
                  </td>
                  <td className="py-4 px-4 text-center whitespace-nowrap">
                    {item.quantity}
                  </td>
                  <td className="py-4 px-4 text-right whitespace-nowrap">
                    {formatCurrency(Number(item.price))}
                  </td>
                  <td className="py-4 px-4 text-right font-medium whitespace-nowrap">
                    {formatCurrency(Number(item.price) * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Toplamlar */}
        <div className="flex justify-end mb-12">
          <div className="w-full md:w-64 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Ara Toplam:</span>
              <span className="font-medium">{formatCurrency(subTotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Toplam KDV:</span>
              <span className="font-medium">
                {formatCurrency(totalTaxAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 mt-2">
              <span className="font-bold text-lg">Genel Toplam:</span>
              <span className="font-bold text-lg text-green-600">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* 5. Alt Bilgi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t mt-auto">
          <div>
            <h4 className="font-bold text-sm mb-2 text-slate-800">
              Banka Bilgileri
            </h4>
            {user?.tenant?.iban ? (
              <div className="bg-slate-50 p-3 rounded border border-slate-100 inline-block w-full md:w-auto">
                <p className="text-xs text-slate-500 font-bold mb-1">IBAN:</p>
                <p className="text-sm font-mono text-slate-700 tracking-wide break-all">
                  {user?.tenant?.iban}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">IBAN bilgisi girilmemiş.</p>
            )}
          </div>
          <div className="text-center mt-4">
            <div className="border-b w-32 mx-auto mb-2"></div>
            <p className="text-xs text-slate-400">İmza / Kaşe</p>
          </div>
        </div>
      </div>
    </div>
  );
}