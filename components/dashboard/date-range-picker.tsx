"use client"

import * as React from "react"
import { format } from "date-fns"
import { tr } from "date-fns/locale" // Türkçe tarih formatı
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function CalendarDateRangePicker({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // URL'den tarihleri okuyalım (Varsayılan: Bu ayın başı ve bugünün tarihi)
  const defaultFrom = searchParams.get("from") ? new Date(searchParams.get("from")!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const defaultTo = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date()

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: defaultFrom,
    to: defaultTo,
  })

  // Tarih değişince URL'i güncelle
  React.useEffect(() => {
    if (date?.from && date?.to) {
      const fromStr = format(date.from, "yyyy-MM-dd")
      const toStr = format(date.to, "yyyy-MM-dd")
      router.push(`?from=${fromStr}&to=${toStr}`)
    }
  }, [date, router])

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "d LLL y", { locale: tr })} -{" "}
                  {format(date.to, "d LLL y", { locale: tr })}
                </>
              ) : (
                format(date.from, "d LLL y", { locale: tr })
              )
            ) : (
              <span>Tarih Aralığı Seç</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            locale={tr} // Takvimi Türkçe yapar
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}