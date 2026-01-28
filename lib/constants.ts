export const PLAN_LIMITS = {
  FREE: {
    maxInvoices: 5,
    maxCustomers: 3,
    canUseAI: false,
    canUseWhatsapp: false,
  },
  PRO: {
    maxInvoices: 999999, // Sınırsız
    maxCustomers: 999999,
    canUseAI: true,
    canUseWhatsapp: true,
  },
  ENTERPRISE: {
    maxInvoices: 999999,
    maxCustomers: 999999,
    canUseAI: true,
    canUseWhatsapp: true,
  }
}