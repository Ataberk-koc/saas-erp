import { auth, signOut } from "@/auth"
import { Sidebar } from "@/components/dashboard/sidebar" // 👈 Yeni bileşeni import ettik
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 overflow-hidden">
      
      {/* Sidebar Bileşeni (Logout butonunu içine prop olarak atıyoruz) */}
      <Sidebar 
        user={session.user} 
        logoutBtn={
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/login" })
            }}
          >
            <button className="w-full text-sm bg-white border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-md transition-colors flex items-center justify-center gap-2">
              🚪 Çıkış Yap
            </button>
          </form>
        }
      />

      {/* --- İÇERİK --- */}
      <main className="flex-1 overflow-auto relative w-full">
        {children}
      </main>
    </div>
  )
}