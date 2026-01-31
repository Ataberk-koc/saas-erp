"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { sendInvoiceEmail } from "@/app/actions/email"
import { Mail, Loader2 } from "lucide-react"

export default function SendMailButton({ invoiceId }: { invoiceId: string }) {
    const [loading, setLoading] = useState(false)

    const handleSend = async () => {
        setLoading(true)
        const res = await sendInvoiceEmail(invoiceId)
        setLoading(false)

        if(res.success) {
            alert(res.success) // Veya toast.success(res.success)
        } else {
            alert(res.error)
        }
    }

    return (
        <Button variant="outline" onClick={handleSend} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            E-Posta Gönder
        </Button>
    )
}