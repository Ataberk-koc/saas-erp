import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ProfileInfoForm, ChangePasswordForm } from "@/components/dashboard/profile-forms"

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  // Güncel veriyi veritabanından çekelim
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { name: true, email: true, role: true }
  })

  if (!user) return <div>Kullanıcı bulunamadı.</div>

  return (
    <div className="p-4 md:p-10 bg-slate-50 min-h-screen space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-800">Profilim</h1>
        <p className="text-slate-500">Hesap bilgilerinizi ve güvenlik ayarlarınızı yönetin.</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Sol Taraf: Profil Bilgileri */}
        <div className="space-y-6">
           <ProfileInfoForm user={user} />
           
           {/* Yetki Bilgisi Kartı (Sadece Bilgi Amaçlı) */}
           <div className="p-4 rounded-lg border bg-blue-50 text-blue-900 text-sm">
              <strong>Rolünüz:</strong> {user.role === 'ADMIN' ? 'Yönetici' : user.role === 'ACCOUNTANT' ? 'Ön Muhasebe' : 'Kullanıcı'}
              <br/>
              Hesap türünüzü değiştirmek için sistem yöneticisiyle iletişime geçin.
           </div>
        </div>

        {/* Sağ Taraf: Şifre Değiştirme */}
        <div>
           <ChangePasswordForm />
        </div>
      </div>
    </div>
  )
}