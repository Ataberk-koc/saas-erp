import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── XSS (Cross-Site Scripting) Koruması ───────────────────────────
// Tehlikeli HTML/script etiketlerini ve event handler'ları temizler.

const DANGEROUS_PATTERNS = [
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,   // <script>...</script>
  /<\/script>/gi,                            // kapanış tag'i tek başına
  /<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi,    // <iframe>
  /<object\b[^>]*>[\s\S]*?<\/object>/gi,    // <object>
  /<embed\b[^>]*>/gi,                        // <embed>
  /<link\b[^>]*>/gi,                         // <link>
  /on\w+\s*=\s*["'][^"']*["']/gi,           // onclick="..." vb. event handler'lar
  /on\w+\s*=\s*[^\s>]+/gi,                  // onclick=alert(1) (tırnaksız)
  /javascript\s*:/gi,                        // javascript: protokolü
  /vbscript\s*:/gi,                          // vbscript: protokolü
  /data\s*:\s*text\/html/gi,                 // data:text/html
  /expression\s*\(/gi,                       // CSS expression()
]

/**
 * Kullanıcı girdisinden tehlikeli HTML/script içeriklerini temizler.
 * Veritabanına kaydetmeden ÖNCE tüm metin alanlarında kullanılmalıdır.
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== "string") return input

  let sanitized = input.trim()

  // Tehlikeli kalıpları temizle
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  // HTML özel karakterlerini encode et
  sanitized = sanitized
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")

  return sanitized
}

/**
 * Girdi XSS içeriyor mu kontrol eder (boolean).
 * Client veya server tarafında ön kontrol için kullanılır.
 */
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== "string") return false
  return DANGEROUS_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0 // regex global flag reset
    return pattern.test(input)
  })
}

/**
 * FormData içindeki tüm metin alanlarını sanitize eder.
 * Server action'larda toplu temizlik için kullanılır.
 */
export function sanitizeFormData(formData: FormData): Map<string, string> {
  const sanitized = new Map<string, string>()
  formData.forEach((value, key) => {
    if (typeof value === "string") {
      sanitized.set(key, sanitizeInput(value))
    }
  })
  return sanitized
}
