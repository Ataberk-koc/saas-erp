"use client"

import { useRef } from "react"
import { addCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFormStatus } from "react-dom"
import { toast } from "sonner" 
import { containsXSS } from "@/lib/utils"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button 
      type="submit" 
      className="w-full bg-blue-600 hover:bg-blue-700 mt-4 md:mt-0" 
      disabled={pending}
    >
      {pending ? "Kaydediliyor..." : "Kaydet"}
    </Button>
  )
}

export function CustomerForm() {
  const formRef = useRef<HTMLFormElement>(null)

  async function clientAction(formData: FormData) {
    // XSS ön kontrolü (client-side)
    const textFields = ["name", "phone", "address"]
    for (const field of textFields) {
      const value = formData.get(field) as string
      if (value && containsXSS(value)) {
        toast.error(`${field === "name" ? "Ad" : field === "phone" ? "Telefon" : "Adres"} alanında güvenlik riski oluşturan içerik tespit edildi!`)
        return
      }
    }

    const result = await addCustomer(formData) as { error?: string }

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("✅ Cari hesap başarıyla eklendi!")
      formRef.current?.reset() 
    }
  }

  return (
    <form ref={formRef} action={clientAction} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      
      <div className="grid gap-2">
        <label className="text-sm font-medium">Firma/Kişi Adı</label>
        <Input name="name" placeholder="Örn: Ahmet Yılmaz A.Ş." required />
      </div>
      
      <div className="grid gap-2">
        <label className="text-sm font-medium">Email</label>
        <Input name="email" placeholder="ahmet@mail.com" maxLength={25} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Telefon</label>
        <Input name="phone" placeholder="0555..." />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">Türü</label>
        <select 
          name="type" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        >
          <option value="BUYER">Müşteri (Alıcı)</option>
          <option value="SUPPLIER">Tedarikçi (Satıcı)</option>
        </select>
      </div>

      {/* 👇 EKSİK OLAN ADRES ALANINI EKLEDİM */}
      <div className="grid gap-2 md:col-span-2">
        <label className="text-sm font-medium">Adres</label>
        <Input name="address" placeholder="Mahalle, Sokak, İlçe/İl..." />
      </div>

      <div className="md:col-span-2 flex justify-end">
        <SubmitButton />
      </div>
    </form>
  )
}