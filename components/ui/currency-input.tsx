"use client"

import React, { useState, useRef, useCallback, useEffect } from "react"
import { Input } from "@/components/ui/input"

/**
 * Yazarken canlı formatlama: "1000000" → "1.000.000", "1000000,5" → "1.000.000,5"
 */
function formatLive(raw: string): string {
  if (!raw) return ""

  const parts = raw.split(",")
  const intPart = parts[0].replace(/\D/g, "")
  const decPart = parts.length > 1 ? parts[1].replace(/\D/g, "").slice(0, 2) : null

  if (!intPart && decPart === null) return ""

  const cleanInt = intPart.replace(/^0+/, "") || (decPart !== null ? "0" : "")
  if (!cleanInt && decPart === null) return ""

  const withDots = cleanInt.replace(/\B(?=(\d{3})+(?!\d))/g, ".")

  if (decPart !== null) return withDots + "," + decPart
  if (parts.length > 1) return withDots + ","
  return withDots
}

/**
 * Sayıyı Türkçe formata çevirir (her zaman 2 ondalık): 10000 → "10.000,00"
 */
function numberToTR(val: number | string): string {
  const num = typeof val === "string"
    ? parseFloat(val.toString().replace(/\./g, "").replace(",", "."))
    : val
  if (isNaN(num) || num === 0) return ""
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Türkçe formatlı string'i sayıya çevirir: "10.000,50" → 10000.5
 */
function parseTR(str: string): number {
  if (!str) return 0
  return parseFloat(str.replace(/\./g, "").replace(",", ".")) || 0
}

interface CurrencyInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "onChange" | "value" | "type" | "defaultValue"
  > {
  value?: number | string
  onValueChange?: (value: number) => void
  defaultValue?: number | string
}

export function CurrencyInput({
  value,
  onValueChange,
  defaultValue,
  name,
  ...props
}: CurrencyInputProps) {
  const [localInput, setLocalInput] = useState(() =>
    numberToTR(value ?? defaultValue ?? 0)
  )
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Form reset olduğunda input'u sıfırla
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    const form = el.closest("form")
    if (!form) return

    const handleReset = () => {
      setLocalInput("")
      onValueChange?.(0)
    }

    form.addEventListener("reset", handleReset)

    // formaction ile submit edildikten sonra Next.js formu resetler
    // MutationObserver ile inputun value'sini izle
    const observer = new MutationObserver(() => {
      if (el.value === "" && localInput !== "") {
        setLocalInput("")
      }
    })
    observer.observe(el, { attributes: true, attributeFilter: ["value"] })

    return () => {
      form.removeEventListener("reset", handleReset)
      observer.disconnect()
    }
  }, [localInput, onValueChange])

  const display = focused
    ? localInput
    : value !== undefined
      ? numberToTR(value)
      : localInput

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const el = e.target
    const rawValue = el.value
    const prevCursor = el.selectionStart ?? rawValue.length

    const beforeCursor = rawValue.slice(0, prevCursor)
    const digitsBefore = beforeCursor.replace(/[^0-9,]/g, "").length

    const formatted = formatLive(rawValue)
    setLocalInput(formatted)
    onValueChange?.(parseTR(formatted))

    requestAnimationFrame(() => {
      if (!inputRef.current) return
      let count = 0
      let newPos = 0
      for (let i = 0; i < formatted.length; i++) {
        if (formatted[i] !== ".") count++
        if (count === digitsBefore) {
          newPos = i + 1
          break
        }
      }
      if (count < digitsBefore) newPos = formatted.length
      inputRef.current.setSelectionRange(newPos, newPos)
    })
  }, [onValueChange])

  const handleBlur = useCallback(() => {
    setFocused(false)
    const num = parseTR(localInput)
    // Blur'da her zaman ,00 ile göster
    const formatted = num ? numberToTR(num) : ""
    setLocalInput(formatted)
    onValueChange?.(num)
  }, [localInput, onValueChange])

  const handleFocus = useCallback(() => {
    setFocused(true)
    if (value !== undefined) {
      setLocalInput(numberToTR(value))
    }
  }, [value])

  const rawNumericValue = parseTR(display)

  return (
    <>
      {name && <input type="hidden" name={name} value={rawNumericValue} />}
      <Input
        {...props}
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={display}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
    </>
  )
}
