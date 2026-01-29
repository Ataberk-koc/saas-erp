/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client"

import { PDFDownloadLink } from "@react-pdf/renderer"
import { InvoicePDF } from "@/components/invoice-pdf"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

export default function DownloadButton({ invoice, tenant }: { invoice: any, tenant: any }) {
  return (
    <PDFDownloadLink
      document={<InvoicePDF invoice={invoice} tenant={tenant} />}
      fileName={`fatura-${invoice.number}.pdf`}
    >
      {/* @ts-ignore */}
      {({ loading }: any) => (
        <Button variant="default" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Download className="mr-2 h-4 w-4" />
          {loading ? "Hazırlanıyor..." : "PDF İndir"}
        </Button>
      )}
    </PDFDownloadLink>
  )
}