import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { addExpense, deleteExpense, addCategory } from "@/app/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"
import { Plus } from "lucide-react"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  
  if (!user?.tenantId) return null

  // 1. Verileri Çek
  const expenses = await prisma.expense.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { date: 'desc' }
  })

  // ✅ DÜZELTME 1: 'let' yerine 'const'
  const categories = await prisma.category.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: 'asc' }
  })

  // Varsayılan Kategoriler
  const defaultCategories = [
    { id: 'default-1', name: '🏠 Kira' },
    { id: 'default-2', name: '🍔 Yemek' },
    { id: 'default-3', name: '🚗 Ulaşım' },
    { id: 'default-4', name: '📢 Pazarlama' },
    { id: 'default-5', name: '🧾 Fatura' },
  ]
  
  // ✅ DÜZELTME 2 & 3: unused vars silindi, 'ts-ignore' kaldırıldı ve tip güvenliği sağlandı
  // Eğer veritabanı boşsa varsayılanları, doluysa veritabanındakileri göster
  let displayCategories: { id: string; name: string }[] = categories;

  if (categories.length === 0) {
      displayCategories = defaultCategories;
  }

  // --- İÇ İÇE COMPONENT: KATEGORİ EKLEME FORMU ---
  async function handleAddCategory(formData: FormData) {
    "use server"
    await addCategory(formData)
  }

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-slate-800">💸 Gider Yönetimi</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* SOL: Gider Ekleme Formu */}
        <div className="md:col-span-1 space-y-6">
            
            {/* 1. Kutu: Yeni Gider Ekle */}
            <Card>
            <CardHeader>
                <CardTitle>Yeni Gider Ekle</CardTitle>
            </CardHeader>
            <CardContent>
                <form action={async (formData) => {
                    "use server"
                    await addExpense(formData)
                }} className="space-y-4">
                
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Açıklama</label>
                    <Input name="description" placeholder="Örn: Ofis Kirası..." required />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Kategori</label>
                    <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {displayCategories.map(c => (
                            <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-400">Listede yoksa aşağıdan ekleyin 👇</p>
                </div>
                
                <div className="grid gap-2">
                    <label className="text-sm font-medium">Tutar (TL)</label>
                    <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>

                <div className="grid gap-2">
                    <label className="text-sm font-medium">Tarih</label>
                    <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700">
                    - Gider Kaydet
                </Button>
                </form>
            </CardContent>
            </Card>

            {/* 2. Kutu: Hızlı Kategori Ekleme */}
            <Card className="bg-blue-50 border-blue-100">
                <CardContent className="p-4">
                    <h3 className="text-sm font-bold text-blue-800 mb-2">➕ Yeni Kategori Ekle</h3>
                    <form action={handleAddCategory} className="flex gap-2">
                        <Input name="name" placeholder="Örn: Drone, Yazılım..." className="bg-white h-9 text-sm" required />
                        <Button size="sm" type="submit" className="bg-blue-600 h-9 w-9 p-0">
                            <Plus size={16} />
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>

        {/* SAĞ: Gider Listesi */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Son Harcamalar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 border-b text-slate-500">
                    <tr>
                    <th className="p-3 whitespace-nowrap">Açıklama</th>
                    <th className="p-3 whitespace-nowrap">Kategori</th>
                    <th className="p-3 whitespace-nowrap">Tarih</th>
                    <th className="p-3 text-right whitespace-nowrap">Tutar</th>
                    <th className="p-3"></th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.length === 0 ? (
                        <tr><td colSpan={5} className="p-4 text-center text-slate-500">Henüz gider kaydı yok.</td></tr>
                    ) : (
                        expenses.map(expense => (
                            <tr key={expense.id} className="border-b hover:bg-slate-50">
                                <td className="p-3 font-medium text-slate-700">{expense.description}</td>
                                <td className="p-3">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {expense.category}
                                    </span>
                                </td>
                                <td className="p-3 text-slate-500">
                                    {new Date(expense.date).toLocaleDateString("tr-TR")}
                                </td>
                                <td className="p-3 text-right font-bold text-red-600">
                                    -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(expense.amount))}
                                </td>
                                <td className="p-3 text-right">
                                    <form action={async () => {
                                        "use server"
                                        await deleteExpense(expense.id)
                                    }}>
                                        <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600 h-8 w-8 p-0">
                                            🗑️
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
    </div>
  )
}