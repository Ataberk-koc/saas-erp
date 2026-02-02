"use client"

import { useState } from "react"
import { updateProfile, changePassword } from "@/app/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

// 👇 YENİ: Server Action'dan dönecek cevap tipini tanımladık
type ActionResult = {
  error?: string
  success?: boolean
  message?: string
}

// --- 1. PROFIL BİLGİLERİ FORMU ---
export function ProfileInfoForm({ user }: { user: { name: string | null; email: string | null } }) {
  const [loading, setLoading] = useState(false)

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // 👇 DÜZELTME: "as any" yerine "as ActionResult" kullandık
    const result = await updateProfile(formData) as ActionResult
    
    setLoading(false)

    if (result.error) toast.error(result.error)
    else toast.success(result.message)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kişisel Bilgiler</CardTitle>
        <CardDescription>Adınızı buradan güncelleyebilirsiniz.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">E-posta (Değiştirilemez)</label>
            <Input value={user.email || ""} disabled className="bg-slate-100" />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Ad Soyad</label>
            <Input name="name" defaultValue={user.name || ""} required />
          </div>
          <Button disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Kaydet
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// --- 2. ŞİFRE DEĞİŞTİRME FORMU ---
export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    
    // 👇 DÜZELTME: "as any" yerine "as ActionResult" kullandık
    const result = await changePassword(formData) as ActionResult
    
    setLoading(false)

    if (result.error) {
        toast.error(result.error)
    } else {
        toast.success(result.message)
        e.currentTarget.reset() // Başarılıysa formu temizle
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifre Değiştir</CardTitle>
        <CardDescription>Hesap güvenliğiniz için güçlü bir şifre seçin.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleChange} className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Mevcut Şifre</label>
            <Input name="currentPassword" type="password" required />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Yeni Şifre</label>
            <Input name="newPassword" type="password" required />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Yeni Şifre (Tekrar)</label>
            <Input name="confirmPassword" type="password" required />
          </div>
          <Button disabled={loading} variant="secondary">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Şifreyi Güncelle
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}