"use client" // 👈 BU SATIR ÇOK ÖNEMLİ! (Tarayıcıda çalışması için)

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false) // Butona basınca kilitlensin diye

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault() // Sayfanın yenilenmesini engeller
    setLoading(true)
    setError("")

    console.log("Giriş deneniyor...", email) // Konsola log atalım (F12)

    try {
      // Auth.js ile giriş yapmayı dene
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError("Giriş başarısız! Email veya şifre yanlış.")
        setLoading(false)
      } else {
        // Başarılıysa Dashboard'a yönlendir
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Bir hata oluştu.",)
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-slate-50">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">SaaS ERP Giriş</CardTitle>
          <CardDescription>
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            {error && (
              <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@demo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Şifre</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
              />
            </div>
          </CardContent>
          <CardFooter className="pt-6">
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}