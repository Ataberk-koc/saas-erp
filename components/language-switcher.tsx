"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex gap-2">
      <Button 
        variant={language === "tr" ? "default" : "outline"} 
        size="sm"
        onClick={() => setLanguage("tr")}
      >
        🇹🇷 TR
      </Button>
      <Button 
        variant={language === "mk" ? "default" : "outline"} 
        size="sm"
        onClick={() => setLanguage("mk")}
      >
        🇲🇰 MK
      </Button>
    </div>
  )
}