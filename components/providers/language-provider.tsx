"use client"

import { createContext, useContext, useState, ReactNode } from "react"
import tr from "@/messages/tr.json"
import mk from "@/messages/mk.json"

// Mevcut diller ve sözlük tipleri
type Language = "tr" | "mk"
type Dictionary = typeof tr

// Context yapısı
interface LanguageContextType {
  language: Language
  dictionary: Dictionary
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)


export function LanguageProvider({ children }: { children: ReactNode }) {
  // Varsayılan dil Türkçe veya localStorage'dan alınan dil
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = typeof window !== "undefined" ? (localStorage.getItem("language") as Language | null) : null;
    return savedLang || "tr";
  });

  // Dil değiştirme fonksiyonu
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem("language", lang)
  }

  // Seçilen dile göre sözlüğü belirle
  const dictionary = language === "tr" ? tr : mk

  return (
    <LanguageContext.Provider value={{ language, dictionary, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

// Kullanım kolaylığı için özel hook
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}