"use client"

import { useState } from "react"
import { getProductReport } from "@/app/actions/report"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Package, DollarSign, Calendar, User, BarChart3, ArrowUpCircle, ArrowDownCircle, Settings, RotateCcw } from "lucide-react"
import { toast } from "sonner"

// --- TİP TANIMLAMALARI ---
interface Product {
  id: string
  name: string
}

interface ReportHistoryItem {
  id: string
  date: Date | string
  type: "SALES" | "PURCHASE"
  customerName: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

interface StockHistoryItem {
  id: string
  date: Date | string
  change: number
  newStock: number
  type: "SALE" | "PURCHASE" | "ADJUSTMENT" | "CANCEL"
  note: string | null
}

interface ReportData {
  productName: string
  currentStock: number
  averageCost: number
  totalSoldQty: number
  totalSoldAmount: number
  totalBoughtQty: number
  totalBoughtAmount: number
  estimatedProfit: number
  history: ReportHistoryItem[]
  stockHistory: StockHistoryItem[]
}

export function ProductReportView({ products }: { products: Product[] }) {
  const [selectedProductId, setSelectedProductId] = useState<string>("")
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)

  const handleProductChange = async (productId: string) => {
    setSelectedProductId(productId)
    setLoading(true)
    
    // Server Action Çağrısı
    const res = await getProductReport(productId)
    setLoading(false)

    if (res.error) {
      toast.error(res.error)
      setReportData(null)
    } else {
      // Gelen veriyi güvenli bir şekilde state'e atıyoruz
      setReportData(res as unknown as ReportData)
    }
  }

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(val)

  return (
    <div className="space-y-6">
      
      {/* 1. Ürün Seçim Alanı */}
      <Card className="border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle>Ürün Analizi Seçimi</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedProductId} onValueChange={handleProductChange}>
            <SelectTrigger className="w-full md:w-100">
              <SelectValue placeholder="Analiz edilecek ürünü seçin..." />
            </SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-10 text-slate-500">Veriler analiz ediliyor...</div>}

      {/* 2. Rapor Sonuçları */}
      {reportData && !loading && (
        <>
          {/* Özet Kartlar */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-600">Mevcut Stok</p>
                    <h3 className="text-2xl font-black text-blue-700">{reportData.currentStock}</h3>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600 bg-white p-1.5 rounded-full" />
                </div>
                <p className="text-xs text-slate-500 mt-1">Anlık stok miktarı</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Toplam Satış Cirosu</p>
                    <h3 className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totalSoldAmount)}</h3>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-600 bg-emerald-50 p-1.5 rounded-full" />
                </div>
                <p className="text-xs text-slate-400 mt-1">{reportData.totalSoldQty} adet satıldı</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Ortalama Alış Maliyeti</p>
                    <h3 className="text-2xl font-bold text-slate-700">{formatCurrency(reportData.averageCost)}</h3>
                  </div>
                  <Package className="h-8 w-8 text-blue-600 bg-blue-50 p-1.5 rounded-full" />
                </div>
                <p className="text-xs text-slate-400 mt-1">Birim başına maliyet</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-500">Toplam Alış Gideri</p>
                    <h3 className="text-2xl font-bold text-red-600">{formatCurrency(reportData.totalBoughtAmount)}</h3>
                  </div>
                  <TrendingDown className="h-8 w-8 text-red-600 bg-red-50 p-1.5 rounded-full" />
                </div>
                <p className="text-xs text-slate-400 mt-1">{reportData.totalBoughtQty} adet alındı</p>
              </CardContent>
            </Card>

            <Card className={reportData.estimatedProfit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-slate-600">Net Kâr / Zarar</p>
                    <h3 className={`text-2xl font-black ${reportData.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(reportData.estimatedProfit)}
                    </h3>
                  </div>
                  <DollarSign className={`h-8 w-8 p-1.5 rounded-full ${reportData.estimatedProfit >= 0 ? 'text-emerald-600 bg-white' : 'text-red-600 bg-white'}`} />
                </div>
                <p className="text-xs text-slate-500 mt-1">Satılan ürünler üzerinden</p>
              </CardContent>
            </Card>
          </div>

          {/* Hareket Tablosu */}
          <Card>
            <CardHeader>
              <CardTitle>Hareket Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlem Türü</TableHead>
                    <TableHead>Cari (Kimden/Kime)</TableHead>
                    <TableHead className="text-center">Miktar</TableHead>
                    <TableHead className="text-right">Birim Fiyat</TableHead>
                    <TableHead className="text-right">Toplam Tutar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.history.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {new Date(item.date).toLocaleDateString("tr-TR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.type === "SALES" ? "default" : "destructive"}>
                          {item.type === "SALES" ? "Satış" : "Alış"}
                        </Badge>
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        <User className="h-4 w-4 text-slate-400" />
                        {item.customerName}
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">
                        {formatCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(item.totalPrice)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {reportData.history.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Bu ürüne ait henüz bir işlem kaydı bulunamadı.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Stok Hareket Geçmişi Tablosu */}
          {reportData.stockHistory && reportData.stockHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Stok Hareket Geçmişi</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarih</TableHead>
                      <TableHead>İşlem Türü</TableHead>
                      <TableHead className="text-center">Değişim</TableHead>
                      <TableHead className="text-center">Yeni Stok</TableHead>
                      <TableHead>Açıklama</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.stockHistory.map((log) => {
                      const typeMap: Record<string, { label: string; icon: React.ReactNode; variant: "default" | "destructive" | "secondary" | "outline" }> = {
                        SALE: { label: "Satış", icon: <ArrowDownCircle className="h-3.5 w-3.5" />, variant: "destructive" },
                        PURCHASE: { label: "Alım", icon: <ArrowUpCircle className="h-3.5 w-3.5" />, variant: "default" },
                        ADJUSTMENT: { label: "Düzeltme", icon: <Settings className="h-3.5 w-3.5" />, variant: "secondary" },
                        CANCEL: { label: "İptal/İade", icon: <RotateCcw className="h-3.5 w-3.5" />, variant: "outline" },
                      }
                      const info = typeMap[log.type] || { label: log.type, icon: null, variant: "secondary" as const }
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {new Date(log.date).toLocaleDateString("tr-TR")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={info.variant} className="flex items-center gap-1 w-fit">
                              {info.icon}
                              {info.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-bold ${log.change > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {log.change > 0 ? `+${log.change}` : log.change}
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold">
                            {log.newStock}
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {log.note || "-"}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}