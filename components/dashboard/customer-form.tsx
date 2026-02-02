"use client"

import { useRef } from "react"
import { addCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFormStatus } from "react-dom"
import { toast } from "sonner" // Toast bildirimi için

// Submit Butonu (Kendi içinde loading durumunu yönetir)
function SubmitButton() {
  const { pending } = useFormStatus()
  
  return (
    <Button 
      type="submit" 
      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 min-w-25" 
      disabled={pending}
    >
      {pending ? "Kaydediliyor..." : "Kaydet"}
    </Button>
  )
}

export function CustomerForm() {
  const formRef = useRef<HTMLFormElement>(null)

  async function clientAction(formData: FormData) {
    const result = await addCustomer(formData) as { error?: string }

    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("✅ Cari hesap başarıyla eklendi!")
      formRef.current?.reset() // Formu temizle
    }
  }

  return (
    <form ref={formRef} action={clientAction} className="flex flex-col md:flex-row gap-4 items-end">
      
      <div className="grid w-full gap-2">
        <label className="text-sm font-medium">Firma/Kişi Adı</label>
        <Input name="name" placeholder="Örn: Ahmet Yılmaz A.Ş." required />
      </div>
      
      <div className="grid w-full gap-2">
        <label className="text-sm font-medium">Email</label>
        <Input name="email" placeholder="ahmet@mail.com" />
      </div>

      <div className="grid w-full gap-2">
        <label className="text-sm font-medium">Telefon</label>
        <Input name="phone" placeholder="0555..." />
      </div>

      <div className="grid w-full gap-2">
        <label className="text-sm font-medium">Türü</label>
        <select 
          name="type" 
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
        >
          <option value="BUYER">Müşteri (Alıcı)</option>
          <option value="SUPPLIER">Tedarikçi (Satıcı)</option>
        </select>
      </div>

      <SubmitButton />
    </form>
  )
}