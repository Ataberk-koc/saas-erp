"use client"

import { useLanguage } from "@/components/providers/language-provider"
import { Select, SelectTrigger, SelectContent, SelectItem } from "@/components/ui/select"

const LANGUAGES = [
  { value: "tr", label: "Türkçe"},
  { value: "mk", label: "Makedonca"},
]

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()

  const selected = LANGUAGES.find(l => l.value === language)

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="w-32 rounded-xl shadow border-2 border-slate-200 bg-white font-semibold">
        <span className="flex items-center gap-2">
          <span>{selected?.label}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(l => (
          <SelectItem key={l.value} value={l.value} className="flex items-center gap-2">
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}