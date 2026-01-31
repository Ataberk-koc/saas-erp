"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvoice, updateInvoice } from "@/app/actions/invoice";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

// 👇 TİP TANIMLAMALARI (Artık 'any' yok)
interface Customer {
  id: string;
  name: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number; // Decimal'den number'a çevrilmiş gelmeli
  vatRate: number;
}

interface InvoiceItem {
  productId: string;
  quantity: number;
  price: number;
  vatRate: number;
}

interface InitialData {
  id: string;
  customerId: string;
  date: Date | string;
  items: InvoiceItem[];
}

interface InvoiceFormProps {
  customers: Customer[];
  products: Product[];
  initialData?: InitialData; // Opsiyonel (Sadece düzenlemede gelir)
}

export function InvoiceForm({ customers, products, initialData }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  
  // State tipini belirttik: InvoiceItem[]
  const [rows, setRows] = useState<InvoiceItem[]>(
    initialData?.items?.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      vatRate: item.vatRate,
    })) || [{ productId: "", quantity: 1, price: 0, vatRate: 18 }]
  );

  const addRow = () => {
    setRows([...rows, { productId: "", quantity: 1, price: 0, vatRate: 18 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) {
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    }
  };

  // value tipi: string veya number olabilir
  const updateRow = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newRows = [...rows];

    newRows[index] = { ...newRows[index], [field]: value };

    // Eğer ürün seçildiyse fiyat ve KDV'yi getir
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newRows[index].price = Number(product.price);
        newRows[index].vatRate = product.vatRate;
      }
    }

    setRows(newRows);
  };

  const calculateTotal = () => {
    return rows.reduce((acc, row) => {
      const total = row.price * row.quantity;
      const vat = total * (row.vatRate / 100);
      return acc + total + vat;
    }, 0);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    formData.append("items", JSON.stringify(rows));

    if (initialData) {
      // DÜZENLEME MODU
      formData.append("id", initialData.id);
      await updateInvoice(formData);
    } else {
      // EKLEME MODU
      await createInvoice(formData);
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Müşteri Seçin</Label>
            <select
              name="customerId"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
              defaultValue={initialData?.customerId || ""}
            >
              <option value="">Seçiniz...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Fatura Tarihi</Label>
            <Input
              name="date"
              type="date"
              required
              defaultValue={
                initialData?.date
                  ? new Date(initialData.date).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-lg">Hizmet ve Ürünler</h3>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="w-4 h-4 mr-2" /> Satır Ekle
            </Button>
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => (
              <div
                key={index}
                className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border p-4 rounded-lg bg-slate-50"
              >
                <div className="md:col-span-4 space-y-2">
                  <Label className="text-xs">Ürün / Hizmet</Label>
                  <select
                    value={row.productId}
                    onChange={(e) =>
                      updateRow(index, "productId", e.target.value)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                    required
                  >
                    <option value="">Seçiniz...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs">Miktar</Label>
                  <Input
                    type="number"
                    min="1"
                    value={row.quantity}
                    onChange={(e) =>
                      updateRow(index, "quantity", Number(e.target.value))
                    }
                    className="h-9"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs">Birim Fiyat</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.price}
                    onChange={(e) =>
                      updateRow(index, "price", Number(e.target.value))
                    }
                    className="h-9"
                    required
                  />
                </div>

                <div className="md:col-span-2 space-y-2">
                  <Label className="text-xs">KDV (%)</Label>
                  <Input
                    type="number"
                    value={row.vatRate}
                    readOnly
                    className="h-9 bg-slate-100"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-between md:justify-end gap-2">
                  <div className="font-bold text-sm">
                    {(
                      row.price * row.quantity +
                      row.price * row.quantity * (row.vatRate / 100)
                    ).toLocaleString("tr-TR", {
                      style: "currency",
                      currency: "TRY",
                    })}
                  </div>
                  {rows.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => removeRow(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <span className="text-slate-500 text-sm">Genel Toplam</span>
              <div className="text-2xl font-bold text-blue-600">
                {calculateTotal().toLocaleString("tr-TR", {
                  style: "currency",
                  currency: "TRY",
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="ghost" onClick={() => window.history.back()}>
          İptal
        </Button>
        <Button type="submit" disabled={loading} className="min-w-37.5">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Değişiklikleri Kaydet" : "Faturayı Oluştur"}
        </Button>
      </div>
    </form>
  );
}