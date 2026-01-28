import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { updateProduct } from "@/app/actions/product"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Düzenlenecek ürünü bul
  const product = await prisma.product.findUnique({
    where: { 
        id: id,
        tenantId: user?.tenantId
    },
  })

  if (!product) notFound()

  // 👇 DÜZELTME BURADA: "bind" yerine "Wrapper" fonksiyonu
  // Bu fonksiyon Server Action'ı çağırır ama geriye veri döndürmez (void).
  // Böylece TypeScript hata vermez.
  async function handleUpdate(formData: FormData) {
    "use server"
    await updateProduct(product!.id, formData)
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen flex justify-center items-start">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>✏️ Ürünü Düzenle</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Action kısmına yeni fonksiyonumuzu yazdık */}
          <form action={handleUpdate} className="space-y-4">
            
            <div className="grid gap-2">
              <label className="text-sm font-medium">Ürün Adı</label>
              <Input name="name" defaultValue={product.name} required />
            </div>
            
            <div className="flex gap-4">
                <div className="grid w-full gap-2">
                <label className="text-sm font-medium">Fiyat (TL)</label>
                {/* Input tipini "text" yaptık ki virgüllü/noktalı rahat yazılsın */}
                <Input 
                    name="price" 
                    type="text" 
                    defaultValue={Number(product.price)} 
                    required 
                />
                </div>

                <div className="grid w-full gap-2">
                <label className="text-sm font-medium">Stok</label>
                <Input name="stock" type="number" defaultValue={product.stock} required />
                </div>
            </div>

            <div className="grid w-full gap-2">
              <label className="text-sm font-medium">KDV Oranı (%)</label>
              <select 
                name="vatRate" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                defaultValue={product.vatRate}
              >
                <option value="0">%0</option>
                <option value="1">%1</option>
                <option value="8">%8</option>
                <option value="10">%10</option>
                <option value="18">%18</option>
                <option value="20">%20</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                <Link href="/dashboard/products">
                    <Button variant="outline" type="button">İptal</Button>
                </Link>
                <Button type="submit">Değişiklikleri Kaydet</Button>
            </div>

          </form>
        </CardContent>
      </Card>
    </div>
  )
}