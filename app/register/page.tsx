"use client";

import { useState } from "react";
import { registerAction } from "@/app/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";

// ❌ Hatalı olan 'sonner' importunu kaldırdık

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await registerAction(formData);

    setLoading(false);

    if (result?.error) {
      alert(result.error); // Basit uyarı kutusu (Hatasız çalışır)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Hesap Oluştur</CardTitle>
          <CardDescription>
            Şirketinizi yönetmeye başlamak için bilgilerinizi girin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-2">
              <Label htmlFor="companyName">Şirket Adı</Label>
              <Input id="companyName" name="companyName" placeholder="Örn: ATA Yazılım A.Ş." required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input id="name" name="name" placeholder="Adınız Soyadınız" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" name="email" type="email" placeholder="ornek@sirket.com" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" name="password" type="password" required />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kayıt Ol ve Başla
            </Button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            Zaten hesabınız var mı?{" "}
            <Link href="/login" className="underline text-blue-600">
              Giriş Yap
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}