import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { addProduct, deleteProduct } from "@/app/actions/product";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { redirect } from "next/navigation";
import Link from "next/link";
import Search from "@/components/search";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  // 1. Arama kelimesini yakala
  const params = await searchParams;
  const query = params?.q || "";

  // 2. Ürünleri Çek
  const products = await prisma.product.findMany({
    where: { 
      tenantId: user?.tenantId,
      name: {
        contains: query,
        mode: "insensitive",
      }
    },
    orderBy: { id: "desc" },
  });

  async function handleSave(formData: FormData) {
    "use server";
    await addProduct(formData);
  }

  return (
    // DÜZELTME 1: Padding mobilde p-4, masaüstünde p-10
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
              <label className="text-sm font-medium">Fiyat (TL)</label>
              <Input
                name="price"
                type="text"
                step="0.01"
                placeholder="1000.00"
                required
              />
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">Stok</label>
              <Input name="stock" type="number" defaultValue="100" required />
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

            {/* DÜZELTME 2: Buton mobilde tam genişlik */}
            <Button type="submit" className="w-full md:w-auto">Ekle</Button>
          </form>
        </CardContent>
      </Card>

      {/* --- Liste Tablosu --- */}
      <Card>
        {/* DÜZELTME 3: Başlık ve Arama mobilde alt alta, desktopta yan yana */}
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle>📋 Ürün Listesi ({products.length})</CardTitle>
          <div className="w-full md:w-72">
             <Search placeholder="Ürün adı ara..." />
          </div>
        </CardHeader>
        <CardContent>
          {/* DÜZELTME 4: Tabloya scroll özelliği (overflow-x-auto) */}
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-4 font-medium whitespace-nowrap">Ürün Adı</th>
                  <th className="p-4 font-medium whitespace-nowrap">Fiyat</th>
                  <th className="p-4 font-medium whitespace-nowrap">KDV</th>
                  <th className="p-4 font-medium whitespace-nowrap">Stok</th>
                  <th className="p-4 font-medium text-right whitespace-nowrap">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-slate-500">
                      {query ? `"${query}" ile eşleşen ürün bulunamadı.` : "Henüz ürün eklenmemiş."}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium whitespace-nowrap">{product.name}</td>
                      <td className="p-4 font-bold text-green-600 whitespace-nowrap">
                        {new Intl.NumberFormat("tr-TR", {
                          style: "currency",
                          currency: "TRY",
                        }).format(Number(product.price))}
                      </td>
                      <td className="p-4 text-slate-600 whitespace-nowrap">
                        %{product.vatRate}{" "}
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 rounded text-xs font-bold ${
                            product.stock > 0
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {product.stock} Adet
                        </span>
                      </td>
                      <td className="p-4 flex justify-end gap-2 whitespace-nowrap">
                        <Link href={`/dashboard/products/${product.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-8">
                            ✏️ Düzenle
                          </Button>
                        </Link>

                        <form
                          action={async () => {
                            "use server";
                            await deleteProduct(product.id);
                          }}
                        >
                          <Button
                            variant="destructive"
                            size="sm"
                            className="h-8"
                          >
                            🗑️ Sil
                          </Button>
                        </form>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}