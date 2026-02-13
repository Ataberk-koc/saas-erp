import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";
import Search from "@/components/search";
import Pagination from "@/components/pagination"; // 👈 YENİ: Sayfalama Bileşeni
import { DeleteProductButton } from "@/components/dashboard/delete-product-button";
import { AddProductForm } from "@/components/dashboard/add-product-form";

const ITEMS_PER_PAGE = 10; // Her sayfada 10 ürün

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // 1. Parametreleri al
  const params = await searchParams;
  const query = params?.q || "";
  const currentPage = Number(params?.page) || 1;

  // 2. Filtreleme Koşulları
  const whereCondition = {
    tenantId: user?.tenantId,
    name: {
      contains: query,
      mode: "insensitive" as const,
    },
  };

  // 3. Toplam Sayıyı Bul (Sayfalama hesabı için)
  const totalItems = await prisma.product.count({
    where: whereCondition,
  });
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

  // 4. Verileri Çek (Sadece o sayfanın verisi)
  const products = await prisma.product.findMany({
    where: whereCondition,
    orderBy: { createdAt: "desc" }, 
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* --- Ekleme Formu --- */}
      <AddProductForm />

      {/* --- Liste Tablosu --- */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>📋 Ürün Listesi ({totalItems})</CardTitle>
          <div className="w-full md:w-72">
            <Search placeholder="Ürün adı ara..." />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">Ürün Adı</th>
                  <th className="p-4 font-medium whitespace-nowrap">Fiyat (₺)</th>
                  <th className="p-4 font-medium whitespace-nowrap">Para Birimi</th>
                  <th className="p-4 font-medium whitespace-nowrap">Kur</th>
                  <th className="p-4 font-medium whitespace-nowrap">Döviz Fiyatı</th>
                  <th className="p-4 font-medium whitespace-nowrap">KDV</th>
                  <th className="p-4 font-medium whitespace-nowrap">Birim</th>
                  <th className="p-4 font-medium whitespace-nowrap">Stok</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-4 text-center text-slate-500">
                      {query
                        ? `"${query}" ile eşleşen ürün bulunamadı.`
                        : "Henüz ürün eklenmemiş."}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium whitespace-nowrap">
                        {product.name}
                      </td>
                      <td className="p-4 font-bold text-green-600 whitespace-nowrap">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(Number(product.price))}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          product.currency === "USD" ? "bg-emerald-100 text-emerald-700" :
                          product.currency === "EUR" ? "bg-indigo-100 text-indigo-700" :
                          product.currency === "GBP" ? "bg-purple-100 text-purple-700" :
                          product.currency === "MKD" ? "bg-cyan-100 text-cyan-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>
                          {product.currency === "USD" ? "$ USD" :
                           product.currency === "EUR" ? "€ EUR" :
                           product.currency === "GBP" ? "£ GBP" :
                           product.currency === "MKD" ? "ден MKD" :
                           "₺ TRY"}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap text-slate-600">
                        {Number(product.exchangeRate) === 1 ? "-" : Number(product.exchangeRate).toFixed(2)}
                      </td>
                      <td className="p-4 font-bold whitespace-nowrap text-blue-600">
                        {product.currency === "TRY" ? "-" : new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: product.currency || "TRY",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        }).format(Number(product.price) / (Number(product.exchangeRate) || 1))}
                      </td>
                      <td className="p-4 text-slate-600 whitespace-nowrap">
                        %{product.vatRate}{" "}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">
                          {product.unit || "Adet"}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            product.stock > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.stock} {product.unit || "Adet"}
                        </span>
                      </td>
                      
                      <td className="p-4 flex justify-end gap-2 whitespace-nowrap">
                        {/* 👇 YENİ: Geçmiş Butonu */}
                        <Link href={`/dashboard/products/${product.id}`}>
                            <Button variant="ghost" size="sm" className="h-8 text-slate-500 hover:text-blue-600">
                                📜 Geçmiş
                            </Button>
                        </Link>

                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8">
                            ✏️ Düzenle
                          </Button>
                        </Link>

                        <DeleteProductButton id={product.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 👇 YENİ: Sayfalama Kontrolü */}
          <div className="mt-4">
            <Pagination totalPages={totalPages} />
          </div>

        </CardContent>
      </Card>
    </div>
  );
}