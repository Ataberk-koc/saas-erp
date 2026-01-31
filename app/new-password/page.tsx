"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { newPassword } from "@/app/actions/reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense } from 'react'

function NewPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await newPassword(formData, token);

    setLoading(false);

    if (result?.error) {
      setError(result.error);
    } else {
      setMessage(result?.success || "");
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Yeni Şifre Belirle</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="password" type="password" placeholder="******" required />
          
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && (
            <div className="text-center">
                <p className="text-sm text-green-500 mb-2">{message}</p>
                <Link href="/login" className="text-blue-600 font-bold underline">Giriş Yap</Link>
            </div>
          )}

          {!message && (
             <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function NewPasswordPage() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4">
             <Suspense fallback={<div>Yükleniyor...</div>}>
                <NewPasswordForm />
             </Suspense>
        </div>
    )
}