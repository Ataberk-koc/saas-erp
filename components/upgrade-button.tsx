"use client"

import { startSubscription } from "@/app/actions/payment"
import { Button } from "./ui/button"
import { useState } from "react"

// Gelen cevabın tipini tanımlıyoruz
interface PaymentResponse {
  success?: boolean
  htmlContent?: string
  error?: string
}

export function UpgradeButton() {
  const [loading, setLoading] = useState(false)

  async function handleUpgrade() {
    setLoading(true)
    
    // 👇 DÜZELTME 1: TypeScript'e cevabın tipini öğretiyoruz (casting)
    // Böylece 'res.success' veya 'res.error' dediğimizde hata vermez.
    const res = (await startSubscription()) as PaymentResponse
    
    if (res.success && res.htmlContent) {
      // Iyzico formunu DOM'a ekleme
      const div = document.createElement("div")
      div.innerHTML = res.htmlContent
      document.body.appendChild(div)
      
      // 👇 DÜZELTME 2: 'eval' yerine Script Enjeksiyonu
      // React 'eval' sevmez. Bunun yerine script'i alıp yeniden oluşturup
      // sayfaya ekliyoruz. Tarayıcı bunu otomatik çalıştırır.
      const script = div.querySelector("script")
      if (script) {
        const newScript = document.createElement("script")
        newScript.textContent = script.innerText
        document.body.appendChild(newScript)
      }
    } else {
      // Artık 'res.error' kullanabiliriz, TypeScript kızmaz.
      alert("Hata: " + res.error)
    }
    setLoading(false)
  }

  return (
    <Button 
      onClick={handleUpgrade} 
      disabled={loading}
      className="bg-linear-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg"
    >
      {loading ? "Yükleniyor..." : "🚀 PRO Pakete Yükselt (299 TL)"}
    </Button>
  )
}