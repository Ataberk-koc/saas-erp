// app/dashboard/layout.tsx (SADECE DASHBOARD İÇİN)
import { auth, signOut } from "@/auth"
import Link from "next/link"
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
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* --- SOL MENÜ (SIDEBAR) --- */}
      <aside className="w-64 bg-white border-r shadow-md flex flex-col z-10">
        
        <div className="h-16 flex items-center px-6 border-b bg-slate-900 text-white">
          <span className="text-lg font-bold tracking-wide">ATA Yazılım Çözümleri</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarLink href="/dashboard" icon="📊" label="Genel Bakış" />
          <SidebarLink href="/dashboard/customers" icon="👥" label="Cari Hesaplar" />
          <SidebarLink href="/dashboard/products" icon="📦" label="Ürünler" />
          <SidebarLink href="/dashboard/invoices" icon="🧾" label="Faturalar" />
          <SidebarLink href="/dashboard/settings" icon="⚙️" label="Ayarlar" />
          <SidebarLink href="/dashboard/expense" icon="💸" label="Giderler" />
          <SidebarLink href="/dashboard/ai" icon="🤖" label="AI Analiz" />
        </nav>

        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {session.user.name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
            </div>
          </div>

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
        </div>
      </aside>

      {/* --- İÇERİK --- */}
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
    </div>
  )
}

function SidebarLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link 
      href={href} 
      className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  )
}