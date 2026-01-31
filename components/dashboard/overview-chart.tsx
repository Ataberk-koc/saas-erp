"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface OverviewChartProps {
  data: {
    name: string
    gelir: number
    gider: number
  }[]
}

export function OverviewChart({ data }: OverviewChartProps) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Gelir / Gider Analizi (Son 6 Ay)</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <div className="h-87.5 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
              />
              <YAxis
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `₺${value}`}
              />
              <Tooltip 
                // 👇 DÜZELTME: Değerin sayı olup olmadığını kontrol ediyoruz
                formatter={(value) => {
                    if (typeof value !== "number") return ""
                    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value)
                }}
                labelStyle={{ color: "#333" }}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Legend />
              
              <Line
                type="monotone"
                dataKey="gelir"
                name="Gelir"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: "#10b981" }}
                activeDot={{ r: 6 }}
              />
              
              <Line
                type="monotone"
                dataKey="gider"
                name="Gider"
                stroke="#ef4444"
                strokeWidth={3}
                dot={{ r: 4, fill: "#ef4444" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}