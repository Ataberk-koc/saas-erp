import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { updateCompanyInfo } from "@/app/actions/settings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: true }
  })

  const company = user?.tenant

  async function handleSave(formData: FormData) {
    "use server"
    await updateCompanyInfo(formData)
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      <h1 className="text-3xl font-bold text-slate-800">⚙️ Şirket Ayarları</h1>

      <form action={handleSave}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* SOL KOLON: İletişim Bilgileri */}
            <Card>
                <CardHeader>
                    <CardTitle>🏢 Firma Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Şirket Adı</label>
                        <Input name="name" defaultValue={company?.name} required />
                    </div>
                    
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">E-Posta</label>
                        <Input name="email" defaultValue={company?.email || ""} />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Telefon</label>
                        <Input name="phone" defaultValue={company?.phone || ""} />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Web Sitesi</label>
                        <Input name="website" defaultValue={company?.website || ""} placeholder="www.sirketim.com" />
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Adres</label>
                        <textarea 
                            name="address" 
                            className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            defaultValue={company?.address || ""}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* SAĞ KOLON: Resmi Bilgiler & Banka */}
            <div className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>⚖️ Vergi Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vergi Dairesi</label>
                            <Input name="taxOffice" defaultValue={company?.taxOffice || ""} />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Vergi Numarası / TCKN</label>
                            <Input name="taxNumber" defaultValue={company?.taxNumber || ""} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>🏦 Banka Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="grid gap-2">
                            <label className="text-sm font-medium">IBAN (TR...)</label>
                            <Input name="iban" defaultValue={company?.iban || ""} placeholder="TR00 0000..." />
                            <p className="text-xs text-slate-500">Bu IBAN faturanın en altında görünecektir.</p>
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
                    💾 Değişiklikleri Kaydet
                </Button>
            </div>

        </div>
      </form>
    </div>
  )
}