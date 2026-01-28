// app/dashboard/invoices/[id]/print-button.tsx
"use client" // 👈 BU SATIR ŞART (Tarayıcıda çalışacağını belirtir)

import { Button } from "@/components/ui/button"

export default function PrintButton() {
  return (
    <Button onClick={() => window.print()} variant="outline">
      🖨️ Yazdır
    </Button>
  )
}