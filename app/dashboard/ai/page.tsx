"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { generateAiReport } from "@/app/actions/ai"

export default function AiPage() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string[]>([])

  async function handleAnalyze() {
    setLoading(true)
    setReport([]) // Önceki raporu temizle
    
    // Yapay zeka isteğini gönder
    const res = await generateAiReport()
    
    if (res.success && res.report) {
      setReport(res.report)
    }
    setLoading(false)
  }

  return (
    <div className="p-10 bg-slate-50 min-h-screen space-y-8">
      
      {/* BAŞLIK KISMI */}
      <div className="flex items-center gap-3">
        <div className="bg-purple-100 p-3 rounded-full">
            <span className="text-3xl">🤖</span>
        </div>
        <div>
            <h1 className="text-3xl font-bold text-slate-800">AI Finans Danışmanı</h1>
            <p className="text-slate-500">Verilerinizi analiz edip size akıllı tavsiyeler verir.</p>
        </div>
      </div>

      {/* RAPOR KARTI */}
      <Card className="max-w-4xl border-t-4 border-t-purple-600 shadow-lg">
        <CardHeader className="bg-slate-50/50 border-b">
            <CardTitle className="flex justify-between items-center">
                <span>Güncel Durum Raporu</span>
                <Button 
                    onClick={handleAnalyze} 
                    disabled={loading}
                    className="bg-purple-600 hover:bg-purple-700 text-white gap-2 transition-all"
                >
                    {loading ? (
                        <>Düşünüyor...</>
                    ) : (
                        <>✨ Şimdi Analiz Et</>
                    )}
                </Button>
            </CardTitle>
        </CardHeader>
        <CardContent className="p-8 min-h-[300px] flex flex-col justify-center">
            
            {/* Yükleniyor Animasyonu */}
            {loading && (
                <div className="flex flex-col items-center gap-4 text-purple-600 animate-pulse">
                    <span className="text-4xl">🧠</span>
                    <p className="font-medium">Veriler taranıyor, hesaplamalar yapılıyor...</p>
                </div>
            )}

            {/* AI Çıktısını Göster (Markdown Destekli) */}
            {!loading && report.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white p-6 rounded-lg border border-slate-100 shadow-sm">
                    {report.map((line, index) => {
                        // 1. Başlıklar veya Kalın Yazılar (** ile başlayanlar)
                        if (line.startsWith('**') || line.includes('**')) {
                            return (
                                <p key={index} className="text-slate-800 font-bold mt-6 mb-2 text-lg border-b pb-1">
                                    {line.replace(/\*\*/g, "")}
                                </p>
                            )
                        }
                        // 2. Madde İşaretleri (* veya - ile başlayanlar)
                        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
                            return (
                                <p key={index} className="text-slate-600 ml-4 list-disc display-list-item">
                                    • {line.replace(/^[\*\-] /, "")}
                                </p>
                            )
                        }
                        // 3. Normal Metinler
                        return <p key={index} className="text-slate-700 leading-relaxed">{line}</p>
                    })}
                </div>
            )}

            {/* Boş Durum (İlk açılış) */}
            {!loading && report.length === 0 && (
                <div className="text-center text-slate-400 space-y-2">
                    <p className="text-6xl grayscale opacity-20">📊</p>
                    <p>Henüz analiz yapılmadı. Yukarıdaki butona basarak başlayın.</p>
                </div>
            )}

        </CardContent>
      </Card>

    </div>
  )
}