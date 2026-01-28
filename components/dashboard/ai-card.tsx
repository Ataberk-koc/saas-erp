"use client"

import { useState } from "react"
import { generateAiReport } from "@/app/actions/ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, RefreshCcw } from "lucide-react"

export function DashboardAiCard() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string[]>([])
  const [analyzed, setAnalyzed] = useState(false)

  async function handleAnalyze() {
    setLoading(true)
    setReport([])
    
    const res = await generateAiReport()
    
    if (res.success && res.report) {
      setReport(res.report)
      setAnalyzed(true)
    }
    setLoading(false)
  }

  return (
    <Card className="border-t-4 border-t-purple-600 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800">
          <Sparkles className="h-5 w-5 text-purple-600" />
          AI Finansal Özet
        </CardTitle>
        <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAnalyze} 
            disabled={loading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
        >
            {loading ? <RefreshCcw className="h-4 w-4 animate-spin mr-1"/> : <Sparkles className="h-4 w-4 mr-1"/>}
            {analyzed ? "Tekrar Analiz Et" : "Analiz Başlat"}
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Başlangıç Durumu */}
        {!analyzed && !loading && (
            <div className="text-center py-6 text-slate-500 text-sm">
                <p>İşletmenizin anlık durumunu merak ediyor musunuz?</p>
                <p>Yapay zeka verilerinizi tarayıp size özet geçsin.</p>
                <Button onClick={handleAnalyze} size="sm" className="mt-4 bg-purple-600 hover:bg-purple-700">
                    Analizi Başlat
                </Button>
            </div>
        )}

        {/* Yükleniyor */}
        {loading && (
            <div className="space-y-2 py-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                <p className="text-xs text-purple-600 text-center pt-2">Veriler inceleniyor...</p>
            </div>
        )}

        {/* Rapor Sonucu (Scroll Edilebilir Alan) */}
        {!loading && report.length > 0 && (
            <div className="mt-2 space-y-2 max-h-62.5 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {report.map((line, index) => {
                    // Başlıklar
                    if (line.startsWith('**') || line.includes('**')) {
                        return <p key={index} className="text-sm font-bold text-slate-800 mt-3">{line.replace(/\*\*/g, "")}</p>
                    }
                    // Maddeler
                    if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                        return <p key={index} className="text-xs text-slate-600 ml-2 border-l-2 border-purple-200 pl-2">
                            {line.replace(/^[\*\-] /, "")}
                        </p>
                    }
                    // Normal Metin
                    return <p key={index} className="text-xs text-slate-600 leading-relaxed">{line}</p>
                })}
            </div>
        )}
      </CardContent>
    </Card>
  )
}