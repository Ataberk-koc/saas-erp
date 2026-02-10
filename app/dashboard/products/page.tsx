import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { addProduct } from "@/app/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";
import Search from "@/components/search";
import Pagination from "@/components/pagination"; // 👈 YENİ: Sayfalama Bileşeni
import { DeleteProductButton } from "@/components/dashboard/delete-product-button";

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
    orderBy: { id: "desc" },
    skip: (currentPage - 1) * ITEMS_PER_PAGE,
    take: ITEMS_PER_PAGE,
  });

  async function handleSave(formData: FormData) {
    "use server";
    await addProduct(formData);
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* --- Ekleme Formu --- */}
      <Card>
        <CardHeader>
          <CardTitle>📦 Yeni Ürün / Hizmet Ekle</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={handleSave}
            className="flex flex-col md:flex-row gap-4 items-end"
          >
            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Ürün Adı</label>
              <Input name="name" placeholder="Örn: Hosting Hizmeti" required />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Fiyat (₺ TL)</label>
              <Input
                name="price"
                type="text"
                step="0.01"
                placeholder="1000.00"
                required
              />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Kur</label>
              <Input
                name="exchangeRate"
                type="text"
                step="0.01"
                placeholder="1"
                defaultValue="1"
              />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Stok</label>
              <Input name="stock" type="number" defaultValue="100" required />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="unit">Birim</Label>
              <Select name="unit" defaultValue="Adet">
                <SelectTrigger>
                  <SelectValue placeholder="Birim Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Adet">Adet</SelectItem>
                  <SelectItem value="Metre">Metre</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Lt">Litre</SelectItem>
                  <SelectItem value="Koli">Koli</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">KDV Oranı (%)</label>
              <select
                name="vatRate"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                defaultValue="20"
              >
                <option value="0">%0</option>
                <option value="1">%1</option>
                <option value="8">%8</option>
                <option value="10">%10</option>
                <option value="18">%18</option>
                <option value="20">%20</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="currency">Para Birimi</Label>
              <Select name="currency" defaultValue="TRY">
                <SelectTrigger>
                  <SelectValue placeholder="Para Birimi Seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TRY">₺ TRY</SelectItem>
                  <SelectItem value="USD">$ USD</SelectItem>
                  <SelectItem value="EUR">€ EUR</SelectItem>
                  <SelectItem value="GBP">£ GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full md:w-auto">
              Ekle
            </Button>
          </form>
        </CardContent>
      </Card>

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
                        }).format(Number(product.price))}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          product.currency === "USD" ? "bg-emerald-100 text-emerald-700" :
                          product.currency === "EUR" ? "bg-indigo-100 text-indigo-700" :
                          product.currency === "GBP" ? "bg-purple-100 text-purple-700" :
                          "bg-orange-100 text-orange-700"
                        }`}>
                          {product.currency === "USD" ? "$ USD" :
                           product.currency === "EUR" ? "€ EUR" :
                           product.currency === "GBP" ? "£ GBP" :
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