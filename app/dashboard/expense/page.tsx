import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { addExpense, deleteExpense } from "@/app/actions/expense"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function ExpensesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  // Giderleri Çek
  const expenses = await prisma.expense.findMany({
    where: { tenantId: user?.tenantId },
    orderBy: { date: 'desc' }
  })

  // Wrapper Functions
  async function handleAdd(formData: FormData) {
    "use server"
    await addExpense(formData)
  }

  // Kategori Etiketlerini Türkçeleştirmek için Helper
  const getCategoryLabel = (cat: string) => {
    switch(cat) {
      case 'RENT': return '🏠 Kira';
      case 'FOOD': return '🍔 Yemek';
      case 'TRANSPORT': return '🚗 Ulaşım';
      case 'MARKETING': return '📢 Pazarlama';
      default: return '🔹 Diğer';
    }
  }

  return (
    // Mobilde p-4, masaüstünde p-10
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      
      <div className="flex justify-between items-center">
         <h1 className="text-3xl font-bold text-slate-800">💸 Gider Yönetimi</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* SOL: Gider Ekleme Formu */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle>Yeni Gider Ekle</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={handleAdd} className="space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Açıklama</label>
                <Input name="description" placeholder="Örn: Ofis Kirası, Elektrik..." required />
              </div>

              {/* 👇 KATEGORİ SEÇİMİ */}
              <div className="grid gap-2">
                 <label className="text-sm font-medium">Kategori</label>
                 <select name="category" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="OTHER">Diğer</option>
                    <option value="RENT">Kira</option>
                    <option value="FOOD">Yemek</option>
                    <option value="TRANSPORT">Ulaşım</option>
                    <option value="MARKETING">Pazarlama</option>
                 </select>
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tutar (TL)</label>
                <Input name="amount" placeholder="1500,50" required />
              </div>

              {/* 👇 TARİH SEÇİMİ */}
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

        {/* SAĞ: Gider Listesi */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Son Harcamalar</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Mobilde tablo taşmasın diye overflow-x-auto */}
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
                                <td className="p-3 font-medium text-slate-700 whitespace-nowrap">{expense.description}</td>
                                
                                {/* 👇 Kategori Gösterimi */}
                                <td className="p-3 whitespace-nowrap">
                                    <span className="text-xs font-bold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                        {getCategoryLabel(expense.category)}
                                    </span>
                                </td>

                                <td className="p-3 text-slate-500 whitespace-nowrap">
                                    {new Date(expense.date).toLocaleDateString("tr-TR")}
                                </td>
                                <td className="p-3 text-right font-bold text-red-600 whitespace-nowrap">
                                    -{new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(expense.amount))}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
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