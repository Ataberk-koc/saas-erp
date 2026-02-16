"use client"

import { useState } from "react"
import { updateCustomer } from "@/app/actions/customer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { Pencil } from "lucide-react"

// Müşteri tipini tanımlayalım
interface Customer {
  id: string
  name: string
  email: string | null
  phone: string | null
  address: string | null
  type: string
}

export function EditCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSave(formData: FormData) {
    setLoading(true)
    // ID'yi forma ekle
    formData.append("id", customer.id)
    
    const result = await updateCustomer(formData) as { error?: string, success?: boolean }

    setLoading(false)
    if (result?.error) {
      toast.error(result.error)
    } else {
      toast.success("Müşteri bilgileri güncellendi!")
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Pencil className="w-4 h-4" />
          Düzenle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Müşteri Düzenle</DialogTitle>
        </DialogHeader>
        
        <form action={handleSave} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Firma / Kişi Adı</Label>
            <Input id="name" name="name" defaultValue={customer.name} required />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">E-Posta</Label>
            <Input id="email" name="email" defaultValue={customer.email || ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" defaultValue={customer.phone || ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Adres</Label>
            <Input id="address" name="address" defaultValue={customer.address || ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="type">Hesap Türü</Label>
            <select 
              name="type" 
              defaultValue={customer.type}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            >
              <option value="BUYER">Müşteri (Alıcı)</option>
              <option value="SUPPLIER">Tedarikçi (Satıcı)</option>
            </select>
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}