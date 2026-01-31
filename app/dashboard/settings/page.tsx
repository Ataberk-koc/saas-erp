import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { updateCompanyInfo } from "@/app/actions/settings"
import { addTeamMember, removeTeamMember } from "@/app/actions/team"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { redirect } from "next/navigation"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  // Kullanıcıyı ve şirketi (içindeki diğer kullanıcılarla birlikte) çekiyoruz
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { tenant: { include: { users: true } } }
  })

  // Sadece Adminler girebilir
  if (session.user.role !== "ADMIN") {
    return <div className="p-10 text-red-500">Bu sayfaya erişim yetkiniz yok!</div>
  }

  const company = user?.tenant
  const teamMembers = company?.users || []

  // --- SERVER ACTION WRAPPERS ---
  async function handleCompanySave(formData: FormData) {
    "use server"
    await updateCompanyInfo(formData)
  }

  async function handleAddMember(formData: FormData) {
    "use server"
    await addTeamMember(formData)
  }

  async function handleRemoveMember(id: string) {
    "use server"
    await removeTeamMember(id)
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      <h1 className="text-3xl font-bold text-slate-800">⚙️ Şirket Ayarları</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* --- SOL TARAFI: ŞİRKET BİLGİLERİ --- */}
        <form action={handleCompanySave} className="space-y-8">
            {/* İletişim */}
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

            {/* Resmi & Banka */}
            <Card>
                <CardHeader>
                    <CardTitle>⚖️ Vergi ve Banka Bilgileri</CardTitle>
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
        </form>

        {/* --- SAĞ TARAF: EKİP YÖNETİMİ --- */}
        <div className="space-y-8">
            
            {/* 1. Yeni Personel Ekleme */}
            <Card className="border-l-4 border-l-purple-500 shadow-sm">
                <CardHeader>
                    <CardTitle>👥 Yeni Personel Ekle</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={handleAddMember} className="space-y-4">
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Ad Soyad</label>
                            <Input name="name" placeholder="Örn: Ahmet Yılmaz" required />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">E-Posta (Giriş için)</label>
                            <Input name="email" type="email" placeholder="ahmet@sirket.com" required />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Şifre Belirle</label>
                            <Input name="password" type="password" placeholder="******" required />
                        </div>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Rol / Yetki</label>
                            <select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                <option value="ACCOUNTANT">Muhasebeci (Kayıt Yapar)</option>
                                <option value="ADMIN">Yönetici (Tam Yetki)</option>
                                <option value="USER">İzleyici (Sadece Görür)</option>
                            </select>
                        </div>
                        <Button type="submit" variant="outline" className="w-full text-purple-700 border-purple-200 hover:bg-purple-50">
                            + Personeli Kaydet
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* 2. Personel Listesi */}
            <Card>
                <CardHeader>
                    <CardTitle>📋 Ekip Listesi</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {teamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors">
                                <div>
                                    <p className="font-medium text-slate-800">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.email}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded ${
                                        member.role === 'ADMIN' ? 'bg-blue-100 text-blue-700' : 
                                        member.role === 'ACCOUNTANT' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {member.role === 'ADMIN' ? 'YÖNETİCİ' : member.role === 'ACCOUNTANT' ? 'MUHASEBECİ' : 'İZLEYİCİ'}
                                    </span>
                                    
                                    {/* Kendini silemesin */}
                                    {member.id !== user?.id && (
                                        <form action={handleRemoveMember.bind(null, member.id)}>
                                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400 hover:text-red-700 hover:bg-red-50">
                                                🗑️
                                            </Button>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ))}
                        {teamMembers.length === 0 && <p className="text-sm text-slate-500 text-center">Henüz ekip üyesi yok.</p>}
                    </div>
                </CardContent>
            </Card>

        </div>

      </div>
    </div>
  )
}