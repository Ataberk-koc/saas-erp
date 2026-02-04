/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer"

// Türkçe karakter desteği
Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
})

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: "Roboto", fontSize: 12, color: "#333", position: "relative" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 10 },
  brand: { fontSize: 24, fontWeight: "bold", color: "#2563eb" },
  invoiceTitle: { fontSize: 20, fontWeight: "bold", textAlign: "right" },
  meta: { fontSize: 10, color: "#666", marginTop: 4, textAlign: "right" },
  section: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  box: { flexGrow: 1 },
  label: { fontSize: 9, color: "#888", marginBottom: 2 },
  value: { fontSize: 11, fontWeight: "bold" },
  table: { marginTop: 20, borderWidth: 1, borderColor: "#eee" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f9fafb", padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tableRow: { flexDirection: "row", padding: 8, borderBottomWidth: 1, borderBottomColor: "#eee" },
  colProduct: { flex: 2 },
  colQty: { flex: 1, textAlign: "center" },
  colPrice: { flex: 1, textAlign: "right" },
  colTotal: { flex: 1, textAlign: "right" },
  footer: { marginTop: 30, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", marginBottom: 5 },
  totalLabel: { width: 100, textAlign: "right", paddingRight: 10, color: "#666" },
  totalValue: { width: 80, textAlign: "right", fontWeight: "bold" },
  grandTotal: { fontSize: 14, color: "#2563eb" },
  // 👇 YENİ EKLENEN STİL (DAMGA)
  stamp: {
    position: "absolute",
    top: 150,
    right: 50,
    transform: "rotate(-20deg)",
    borderWidth: 4,
    padding: 10,
    paddingHorizontal: 20,
    opacity: 0.5,
    borderRadius: 5,
    zIndex: 10,
  },
  stampText: {
    fontSize: 30,
    fontWeight: "heavy", // react-pdf'de bold yerine heavy bazen daha iyi sonuç verir
    textTransform: "uppercase",
  }
})

interface InvoicePDFProps {
  invoice: any
  tenant: any
}

export const InvoicePDF = ({ invoice, tenant }: InvoicePDFProps) => {
  const subTotal = invoice.items.reduce((acc: number, item: any) => acc + Number(item.price) * item.quantity, 0)
  const totalTax = invoice.items.reduce((acc: number, item: any) => acc + (Number(item.price) * item.quantity * (item.vatRate / 100)), 0)
  const grandTotal = subTotal + totalTax

  const formatMoney = (amount: number) => 
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* 👇 YENİ EKLENEN KISIM: DAMGA KONTROLÜ */}
        {invoice.status === "PAID" && (
          <View style={[styles.stamp, { borderColor: "#16a34a" }]}>
             <Text style={[styles.stampText, { color: "#16a34a" }]}>ÖDENDİ</Text>
          </View>
        )}
        
        {invoice.status === "CANCELLED" && (
          <View style={[styles.stamp, { borderColor: "#dc2626" }]}>
             <Text style={[styles.stampText, { color: "#dc2626" }]}>İPTAL</Text>
          </View>
        )}
        {/* 👆 DAMGA KONTROLÜ BİTİŞ */}

        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>{tenant?.name || "ŞİRKET ADI"}</Text>
            <Text style={{ fontSize: 10, marginTop: 5 }}>{tenant?.email}</Text>
            <Text style={{ fontSize: 10 }}>{tenant?.phone}</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>FATURA</Text>
            <Text style={styles.meta}>No: #{invoice.number}</Text>
            <Text style={styles.meta}>Tarih: {new Date(invoice.date).toLocaleDateString("tr-TR")}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.box}>
            <Text style={styles.label}>SAYIN:</Text>
            <Text style={styles.value}>{invoice.customer.name}</Text>
            <Text style={{ fontSize: 10 }}>{invoice.customer.email}</Text>
            <Text style={{ fontSize: 10 }}>{invoice.customer.phone}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colProduct}>Ürün / Hizmet</Text>
            <Text style={styles.colQty}>Adet</Text>
            <Text style={styles.colPrice}>Birim Fiyat</Text>
            <Text style={styles.colTotal}>Toplam</Text>
          </View>
          
          {invoice.items.map((item: any, i: number) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colProduct}>{item.product.name}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{formatMoney(Number(item.price))}</Text>
              <Text style={styles.colTotal}>{formatMoney(Number(item.price) * item.quantity)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Ara Toplam:</Text>
            <Text style={styles.totalValue}>{formatMoney(subTotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>KDV:</Text>
            <Text style={styles.totalValue}>{formatMoney(totalTax)}</Text>
          </View>
          <View style={[styles.totalRow, { marginTop: 5, borderTopWidth: 1, borderColor: "#ccc", paddingTop: 5 }]}>
            <Text style={[styles.totalLabel, styles.grandTotal]}>GENEL TOPLAM:</Text>
            <Text style={[styles.totalValue, styles.grandTotal]}>{formatMoney(grandTotal)}</Text>
          </View>
        </View>

        <View style={{ position: "absolute", bottom: 30, left: 30, right: 30, textAlign: "center", borderTopWidth: 1, borderColor: "#eee", paddingTop: 10 }}>
             <Text style={{ fontSize: 8, color: "#aaa" }}>Bu fatura {tenant?.name} tarafından ATA ERP sistemi kullanılarak oluşturulmuştur.</Text>
        </View>
      </Page>
    </Document>
  )
}