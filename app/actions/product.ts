"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sanitizeInput } from "@/lib/utils";


// Fiyat temizleme yardımcısı
function cleanPrice(priceString: string) {
  if (!priceString) return "0";
  priceString = priceString.trim();
  if (priceString.includes(".") && priceString.includes(",")) {
    priceString = priceString.replace(/\./g, "");
    return priceString.replace(",", ".");
  }
  const dotCount = (priceString.match(/\./g) || []).length;
  if (dotCount > 1) {
    return priceString.replace(/\./g, "");
  }
  if (dotCount === 1) {
    const afterDot = priceString.split(".")[1];
    if (afterDot && afterDot.length === 3) {
      return priceString.replace(".", "");
    }
    return priceString;
  }
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

  const name = sanitizeInput(formData.get("name") as string);
  const priceStr = cleanPrice(formData.get("price") as string);
  const buyPriceStr = cleanPrice(formData.get("buyPrice") as string);
  const stockStr = formData.get("stock") as string;
  const vatRateStr = formData.get("vatRate") as string;
  const unit = sanitizeInput((formData.get("unit") as string) || "Adet");
  const currency = (formData.get("currency") as string) || "TRY";
  const exchangeRateStr = cleanPrice(formData.get("exchangeRate") as string);

  let price = parseFloat(priceStr) || 0;
  const buyPrice = parseFloat(buyPriceStr) || 0;
  const stock = parseInt(stockStr) || 0;
  const vatRate = parseFloat(vatRateStr) || 0;

  const parsedRate = parseFloat(exchangeRateStr);
  if (isNaN(parsedRate) || parsedRate <= 0) {
    return { error: "Kur değeri geçerli bir pozitif sayı olmalıdır." };
  }
  const exchangeRate = parsedRate;

  if (!name) return { error: "Ürün adı zorunludur." };

  const existingProduct = await prisma.product.findFirst({
    where: {
      tenantId: user.tenantId,
      name: {
        equals: name,
        mode: "insensitive"
      }
    }
  });

  if (existingProduct) {
    if (formData.get("forceMerge") === "true") {
      try {
        await prisma.$transaction(async (tx) => {
          // 👇 GÜNCELLEME BURADA: Sadece stoğu değil, fiyatları da güncelliyoruz
          await tx.product.update({
            where: { id: existingProduct.id },
            data: { 
                stock: { increment: stock },
                price: price,       // Yeni Satış Fiyatı
                buyPrice: buyPrice, // Yeni Alış Fiyatı
                currency: currency, // Para birimi değiştiyse güncelle
                exchangeRate: exchangeRate // Kur değiştiyse güncelle
            }
          });

          // 👇 GÜNCELLEME BURADA: Log'a fiyat bilgisini ekliyoruz
          if (stock > 0) {
            await tx.inventoryLog.create({
              data: {
                productId: existingProduct.id,
                change: stock,
                newStock: existingProduct.stock + stock,
                type: "PURCHASE",
                // Not kısmına fiyat detayını ekledik:
                note: `Stok birleştirildi. (+${stock} ${unit}). Yeni Alış: ${buyPrice} ${currency}, Yeni Eklenen Fiyat: ${price} ${currency}`,
                tenantId: user.tenantId,
              }
            });
          }
        });
        revalidatePath("/dashboard/products");
        return { success: true, message: "Stoklar ve fiyatlar güncellendi!" };
      } catch {
        return { error: "Birleştirme sırasında hata oluştu." };
      }
    }

    return {
      confirmationRequired: true,
      // Mesajı da güncelledim
      message: `"${existingProduct.name}" zaten var. (Mevcut Stok: ${existingProduct.stock}). \n\nEklenecek ${stock} adeti mevcut stoğun üzerine ekleyip, ÜRÜN FİYATINI GÜNCELLEMEK ister misiniz?`
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          price,
          buyPrice,
          stock,
          vatRate,
          unit,
          currency,
          exchangeRate,
          tenantId: user.tenantId,
        },
      });

      if (stock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            change: stock,
            newStock: stock,
            type: "PURCHASE", 
            // İlk açılışta da fiyatı not düşelim
            note: `İlk giriş (${unit}). Alış: ${buyPrice} ${currency}, Satış: ${price} ${currency}`,
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

// ... (deleteProduct ve updateProduct fonksiyonları aynı kalacak, onları değiştirmene gerek yok)
export async function deleteProduct(id: string) {
    // ... eski kodların aynısı ...
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

export async function updateProduct(formData: FormData) {
    // ... eski kodların aynısı ...
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