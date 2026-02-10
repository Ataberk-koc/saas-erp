"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sanitizeInput } from "@/lib/utils";


// Fiyat temizleme yardımcısı
function cleanPrice(priceString: string) {
  if (!priceString) return "0";

  // Boşlukları temizle
  priceString = priceString.trim();

  // Hem nokta hem virgül varsa (1.000,50) -> Noktayı sil, virgülü nokta yap
  if (priceString.includes(".") && priceString.includes(",")) {
    priceString = priceString.replace(/\./g, "");
    return priceString.replace(",", ".");
  }

  // Birden fazla nokta varsa (100.000.000) -> Hepsi binlik ayraç, sil
  const dotCount = (priceString.match(/\./g) || []).length;
  if (dotCount > 1) {
    return priceString.replace(/\./g, "");
  }

  // Tek nokta varsa: noktadan sonra 3 hane = binlik (1.000), değilse ondalık (10.50)
  if (dotCount === 1) {
    const afterDot = priceString.split(".")[1];
    if (afterDot && afterDot.length === 3) {
      // Binlik ayraç (1.000 -> 1000)
      return priceString.replace(".", "");
    }
    // Ondalık (10.50 -> 10.50)
    return priceString;
  }

  // Sadece virgül varsa (10,50) -> Noktaya çevir
  return priceString.replace(",", ".");
}

// 1. ÜRÜN EKLEME
export async function addProduct(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.tenantId) return { error: "Şirket bulunamadı!" };

  // Manuel Veri Alma (Şema validasyonu yerine güvenli manuel dönüşüm)
  const name = sanitizeInput(formData.get("name") as string);
  const priceStr = cleanPrice(formData.get("price") as string);
  const buyPriceStr = cleanPrice(formData.get("buyPrice") as string); // 👈 YENİ: Alış Fiyatı
  const stockStr = formData.get("stock") as string;
  const vatRateStr = formData.get("vatRate") as string;
  const unit = sanitizeInput((formData.get("unit") as string) || "Adet");
  const currency = (formData.get("currency") as string) || "TRY";
  const exchangeRateStr = cleanPrice(formData.get("exchangeRate") as string);

  const price = parseFloat(priceStr) || 0;
  const buyPrice = parseFloat(buyPriceStr) || 0;
  const stock = parseInt(stockStr) || 0;
  const vatRate = parseFloat(vatRateStr) || 0;

  // Kur değerini doğrula: sadece sayısal değer kabul et, string engelle
  const parsedRate = parseFloat(exchangeRateStr);
  if (isNaN(parsedRate) || parsedRate <= 0) {
    return { error: "Kur değeri geçerli bir pozitif sayı olmalıdır." };
  }
  const exchangeRate = parsedRate;

  if (!name) return { error: "Ürün adı zorunludur." };

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Ürünü Oluştur
      const newProduct = await tx.product.create({
        data: {
          name,
          price,
          buyPrice, // 👈 Kaydediyoruz
          stock,
          vatRate,
          unit,
          currency,
          exchangeRate,
          tenantId: user.tenantId,
        },
      });

      // 2. Stok Logu Oluştur
      if (stock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            change: stock,
            newStock: stock,
            type: "PURCHASE", 
            note: `Yeni ürün kartı (${unit})`, // Not kısmına birimi ekledim
            tenantId: user.tenantId,
          },
        });
      }
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Ürün eklenirken hata oluştu." };
  }
}

// 2. ÜRÜN SİLME
export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" };

  // Rol kontrolü (İsteğe bağlı, senin kodunda vardı)
  // if (session.user.role !== "ADMIN") return { error: "Yetkisiz işlem" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" };

  try {
    await prisma.product.delete({
      where: {
        id: id,
        tenantId: user.tenantId,
      },
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch {
    return {
      error: "Silinirken hata oluştu (Faturada kullanılıyor olabilir).",
    };
  }
}

// 3. ÜRÜN GÜNCELLEME
export async function updateProduct(formData: FormData) { // 👈 id'yi formData içinden alıyoruz
  const session = await auth();
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" };

  const id = formData.get("id") as string;
  const name = sanitizeInput(formData.get("name") as string);
  if (!name) return { error: "Ürün adı boş olamaz." };
  const priceStr = cleanPrice(formData.get("price") as string);
  const buyPriceStr = cleanPrice(formData.get("buyPrice") as string);
  const stockStr = formData.get("stock") as string;
  const vatRateStr = formData.get("vatRate") as string;
  const unit = sanitizeInput((formData.get("unit") as string) || "Adet");
  const currency = (formData.get("currency") as string) || "TRY";
  const exchangeRateStr = cleanPrice(formData.get("exchangeRate") as string);

  const price = parseFloat(priceStr) || 0;
  const buyPrice = parseFloat(buyPriceStr) || 0;
  const stock = parseInt(stockStr) || 0;
  const vatRate = parseFloat(vatRateStr) || 0;

  // Kur değerini doğrula: sadece sayısal değer kabul et, string engelle
  const parsedRateUpdate = parseFloat(exchangeRateStr);
  if (isNaN(parsedRateUpdate) || parsedRateUpdate <= 0) {
    return { error: "Kur değeri geçerli bir pozitif sayı olmalıdır." };
  }
  const exchangeRate = parsedRateUpdate;

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Eski veriyi çek
      const oldProduct = await tx.product.findUnique({ where: { id } });
      if (!oldProduct) throw new Error("Ürün bulunamadı");
      
      const oldStock = oldProduct.stock;
      const stockDifference = stock - oldStock;

      // 2. Güncelle
      await tx.product.update({
        where: { id, tenantId: user.tenantId },
        data: {
          name,
          price,
          buyPrice,
          stock,
          vatRate,
          unit,
          currency,
          exchangeRate,
        },
      });

      // 3. Stok değiştiyse Logla
      if (stockDifference !== 0) {
        await tx.inventoryLog.create({
          data: {
            productId: id,
            change: stockDifference,
            newStock: stock,
            type: "ADJUSTMENT",
            note: `Manuel güncelleme (${unit})`,
            tenantId: user.tenantId,
          },
        });
      }
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Güncellenirken hata oluştu." };
  }
}