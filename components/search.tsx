// components/search.tsx
"use client"

import { Input } from "@/components/ui/input"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

export default function Search({ placeholder }: { placeholder: string }) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams)
    
    if (term) {
      params.set("q", term)
    } else {
      params.delete("q")
    }
    
    // URL'i güncelle (Sayfa yenilenmez, sadece veri değişir)
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="relative flex flex-1 shrink-0">
      <Input
        className="w-full bg-white pl-10" // Sol boşluk ikon için
        placeholder={placeholder}
        onChange={(e) => {
           // Her tuşa basışta değil, 300ms bekleyip arama yapsın (Performans)
           setTimeout(() => handleSearch(e.target.value), 300)
        }}
        defaultValue={searchParams.get("q")?.toString()}
      />
      {/* Büyüteç İkonu (Absolute ile inputun içine koyduk) */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        🔍
      </span>
    </div>
  )
}