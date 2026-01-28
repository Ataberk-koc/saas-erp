import { auth } from "@/auth"
import { prisma } from "@/lib/db"
import { iyzipay } from "@/lib/iyzipay"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { CheckCircle2, XCircle } from "lucide-react"

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const { token } = await searchParams

  if (!token) {
    return <div className="p-10 text-red-500">Hatalı İşlem: Token yok.</div>
  }

  // Token'ı Iyzico'ya sorup doğrulayalım
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    iyzipay.checkoutForm.retrieve({ token: token }, (err: any, result: any) => {
      resolve(result)
    })
  })

  let isSuccess = false
  let message = ""

  if (result.status === "success" && result.paymentStatus === "SUCCESS") {
    isSuccess = true
    message = "Ödemeniz başarıyla alındı. Pro paketiniz aktif edildi!"

    // 🔥 VERİTABANINI GÜNCELLE 🔥
    // Kullanıcının tenant'ını bulup planını PRO yapıyoruz
    await prisma.tenant.updateMany({
      where: { 
        // ConversationId olarak tenantId yollamıştık
        id: result.conversationId 
      },
      data: { plan: "PRO" }
    })

  } else {
    isSuccess = false
    message = "Ödeme başarısız oldu veya iptal edildi."
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-100 text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            {isSuccess ? (
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className={isSuccess ? "text-green-600" : "text-red-600"}>
            {isSuccess ? "Ödeme Başarılı!" : "Ödeme Başarısız"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600 mb-6">{message}</p>
          <Link href="/dashboard">
            {/* 👇 DÜZELTME: Dashboard'a -> Dashboard&apos;a */}
            <Button className="w-full">Dashboard&apos;a Dön</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}