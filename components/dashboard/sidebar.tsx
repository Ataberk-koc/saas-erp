"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


interface SidebarProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  };
  logoutBtn: React.ReactNode;
}

export function Sidebar({ user, logoutBtn }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* --- MOBİL ÜST BAR --- */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white border-b border-slate-800">
        <span className="font-bold tracking-wide">ATA Yazılım</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="text-white hover:bg-slate-800"
        >
          {isOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* --- SIDEBAR --- */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r shadow-md flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo Alanı */}
        <div className="h-16 items-center px-6 border-b bg-slate-900 text-white hidden md:flex">
          <span className="text-lg font-bold tracking-wide">
            ATA Yazılım Çözümleri
          </span>
        </div>

        {/* Menü Linkleri */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarLink
            href="/dashboard"
            icon="📊"
            label="Genel Bakış"
            onClick={() => setIsOpen(false)}
          />
          <SidebarLink
            href="/dashboard/customers"
            icon="👥"
            label="Müşteri/Tedarikçiler"
            onClick={() => setIsOpen(false)}
          />
          <SidebarLink
            href="/dashboard/products"
            icon="📦"
            label="Ürünler"
            onClick={() => setIsOpen(false)}
          />
          

          <SidebarLink
            href="/dashboard/invoices"
            icon="🧾"
            label="Faturalar"
            onClick={() => setIsOpen(false)}
          />
                    
          <SidebarLink
            href="/dashboard/expense"
            icon="💸"
            label="Giderler"
            onClick={() => setIsOpen(false)}
          />
          <SidebarLink
            href="/dashboard/ai"
            icon="🤖"
            label="AI Analiz"
            onClick={() => setIsOpen(false)}
          />
          <SidebarLink
            href="/dashboard/profile"
            icon="👤 "
            label="Profil"
            onClick={() => setIsOpen(false)}
          />
          <SidebarLink
            href="/dashboard/reports"
            icon="📈"
            label="Raporlar"
            onClick={() => setIsOpen(false)}
          />
          
          {/* ✅ SADECE ADMIN GÖRSÜN */}
          {user?.role === "ADMIN" && (
            <SidebarLink 
              href="/dashboard/settings" 
              icon="⚙️" 
              label="Ayarlar" 
              onClick={() => setIsOpen(false)}
            />
          )}
        </nav>

        {/* Alt Profil Alanı */}
        <div className="p-4 border-t bg-slate-50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate text-slate-700">
                {user?.name}
              </p>
            </div>
          </div>
          {logoutBtn}
        </div>
      </aside>

      {/* --- BACKDROP --- */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all group"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">
        {icon}
      </span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}