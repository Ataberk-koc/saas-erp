"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInvoice, updateInvoice } from "@/app/actions/invoice";
import { Loader2, Plus, Trash2, Minus } from "lucide-react"; // Minus ikonu eklendi
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner"; // Toast bildirimi için

// 👇 DÜZELTME 1: Tipleri 'number | string' yaptık.
// Bu sayede inputun içi tamamen silindiğinde "0" yazmak zorunda kalmaz, boş kalabilir.
interface InvoiceItem {
  productId: string;
  quantity: number | string; 
  price: number | string;
  vatRate: number;
}

interface Customer {
  id: string;
  name: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  vatRate: number;
}

interface InitialData {
  id: string;
  customerId: string;
  date: Date | string;
  items: {
    productId: string;
    quantity: number;
    price: number;
    vatRate: number;
  }[];
}

interface InvoiceFormProps {
  customers: Customer[];
  products: Product[];
  initialData?: InitialData;
}

export function InvoiceForm({ customers, products, initialData }: InvoiceFormProps) {
  const [loading, setLoading] = useState(false);
  
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

  const updateRow = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newRows = [...rows];
    
    // 👇 DÜZELTME 2: Boş string gelirse (silme işlemi) state'e boş string olarak atıyoruz.
    // Böylece input "0"a dönüşüp kullanıcıyı çıldırtmıyor.
    newRows[index] = { ...newRows[index], [field]: value };

    // Ürün seçildiğinde fiyatı ve KDV'yi otomatik getir
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product) {
        newRows[index].price = product.price;
        newRows[index].vatRate = product.vatRate;
      }
    }

    setRows(newRows);
  };

  // 👇 YENİ: Miktar Arttırma/Azaltma Fonksiyonları
  const handleQuantityStep = (index: number, increment: number) => {
    const currentQty = Number(rows[index].quantity) || 0;
    const newQty = Math.max(1, currentQty + increment); // 1'in altına düşmesin
    updateRow(index, "quantity", newQty);
  };

  const calculateTotal = () => {
    return rows.reduce((acc, row) => {
      // Hesaplama yaparken boş stringleri 0 kabul et
      const qty = Number(row.quantity) || 0;
      const prc = Number(row.price) || 0;
      
      const total = prc * qty;
      const vat = total * (row.vatRate / 100);
      return acc + total + vat;
    }, 0);
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    // Göndermeden önce tüm değerlerin sayı olduğundan emin ol (Boşlukları temizle)
    const sanitizedRows = rows.map(r => ({
      ...r,
      quantity: Number(r.quantity) || 1, // Boşsa 1 yap
      price: Number(r.price) || 0        // Boşsa 0 yap
    }));

    const formData = new FormData(event.currentTarget);
    formData.set("items", JSON.stringify(sanitizedRows)); // Düzeltilmiş veriyi koy

    let result;
    if (initialData) {
      formData.append("id", initialData.id);
      result = await updateInvoice(formData) as { error?: string };
    } else {
      result = await createInvoice(formData) as { error?: string };
    }

    if (!result?.error) {
       toast.success(initialData ? 'Fatura güncellendi!' : 'Fatura oluşturuldu! Yönlendiriliyorsunuz...');
       // Sayfayı resetle veya yönlendir (Action zaten redirect yapıyor ama UX için)
       if(!initialData) {
          const form = document.querySelector('form') as HTMLFormElement;
          if(form) form.reset();
          setRows([{ productId: "", quantity: 1, price: 0, vatRate: 18 }]);
       }
    } else {
       toast.error(result.error);
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
                {/* 1. Ürün Seçimi (4 Kolon) */}
                <div className="md:col-span-4 space-y-2">
                  <Label className="text-xs">Ürün / Hizmet</Label>
                  <select
                    value={row.productId}
                    onChange={(e) =>
                      updateRow(index, "productId", e.target.value)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
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

                {/* 2. Miktar Alanı (Mobilde Butonlu) (3 Kolon) */}
                <div className="md:col-span-3 space-y-2">
                  <Label className="text-xs">Adet</Label>
                  <div className="flex items-center">
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 rounded-r-none border-r-0"
                      onClick={() => handleQuantityStep(index, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={row.quantity}
                      onChange={(e) => updateRow(index, "quantity", e.target.value)}
                      className="h-10 text-center rounded-none z-10 focus-visible:ring-1"
                      required
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-10 w-10 rounded-l-none border-l-0"
                      onClick={() => handleQuantityStep(index, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* 3. Birim Fiyat (3 Kolon) */}
                <div className="md:col-span-3 space-y-2">
                  <Label className="text-xs">Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    // Boşsa boş kalsın, sıfırsa 0 yazsın
                    value={row.price}
                    onChange={(e) => updateRow(index, "price", e.target.value)}
                    className="h-10"
                    required
                  />
                </div>

                {/* 4. KDV & Silme (2 Kolon) */}
                <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <div className="space-y-2 w-full">
                        <Label className="text-xs">KDV</Label>
                        <div className="flex items-center h-10 px-3 border rounded-md bg-slate-100 text-sm text-slate-600">
                             %{row.vatRate}
                        </div>
                    </div>
                  
                    {rows.length > 1 && (
                        <div className="pb-0.5"> {/* Hizalama ayarı */}
                            <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-10 w-10 mt-6"
                            onClick={() => removeRow(index)}
                            >
                            <Trash2 className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <div className="text-right">
              <span className="text-slate-500 text-sm">Genel Toplam (KDV Dahil)</span>
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
        <Button type="submit" disabled={loading} className="min-w-32 bg-blue-600 hover:bg-blue-700">
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? "Kaydet" : "Oluştur"}
        </Button>
      </div>
    </form>
  );
}