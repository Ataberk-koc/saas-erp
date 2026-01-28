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

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
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
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Tutar (TL)</label>
                <Input name="amount" placeholder="1500,50" required />
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
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 border-b text-slate-500">
                <tr>
                  <th className="p-3">Açıklama</th>
                  <th className="p-3">Tarih</th>
                  <th className="p-3 text-right">Tutar</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-slate-500">Henüz gider kaydı yok.</td></tr>
                ) : (
                    expenses.map(expense => (
                        <tr key={expense.id} className="border-b hover:bg-slate-50">
                            <td className="p-3 font-medium">{expense.description}</td>
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
                                    <Button variant="ghost" size="sm" className="text-slate-400 hover:text-red-600">Sil</Button>
                                </form>
                            </td>
                        </tr>
                    ))
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}