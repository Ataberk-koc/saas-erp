"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { productSchema } from "@/lib/schemas";

// Fiyat temizleme yardımcısı
function cleanPrice(priceString: string) {
  if (!priceString) return "0";

  if (priceString.includes(".") && priceString.includes(",")) {
    priceString = priceString.replace(/\./g, "");
  } else if (priceString.includes(".") && !priceString.includes(",")) {
    priceString = priceString.replace(/\./g, "");
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

  const rawData = {
    name: formData.get("name"),
    price: cleanPrice(formData.get("price") as string),
    stock: formData.get("stock"),
    vatRate: formData.get("vatRate"),
  };

  const validation = productSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, price, stock, vatRate } = validation.data;

  try {
    // Ürün eklerken de başlangıç stoğu için log atabiliriz (Opsiyonel ama yararlı)
    await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name,
          price,
          stock,
          vatRate,
          tenantId: user.tenantId,
        },
      });

      if (stock > 0) {
        await tx.inventoryLog.create({
          data: {
            productId: newProduct.id,
            change: stock,
            newStock: stock,
            type: "PURCHASE", // İlk giriş olduğu için Alım/Giriş diyebiliriz
            note: "Yeni ürün kartı açılışı",
            tenantId: user.tenantId,
          },
        });
      }
    });

    revalidatePath("/dashboard/products");
    return { success: true };
  } catch {
    return { error: "Ürün eklenirken hata oluştu." };
  }
}

// 2. ÜRÜN SİLME
export async function deleteProduct(id: string) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" };

  if (session.user.role !== "ADMIN") {
    return { error: "Ürün silme yetkiniz yok! Sadece Yönetici silebilir." };
  }

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

// 3. ÜRÜN GÜNCELLEME (LOGLU)
export async function updateProduct(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return { error: "Yetkisiz işlem!" };

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });
  if (!user?.tenantId) return { error: "Şirket bulunamadı!" };

  // A. Veriyi Hazırla
  const rawData = {
    name: formData.get("name"),
    price: cleanPrice(formData.get("price") as string),
    stock: formData.get("stock"),
    vatRate: formData.get("vatRate"),
  };

  // B. Zod Validasyonu
  const validation = productSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.issues[0].message };
  }

  const { name, price, stock, vatRate } = validation.data;

  try {
    // Transaction ile güvenli güncelleme ve loglama
    await prisma.$transaction(async (tx) => {
      // 1. Eski veriyi çek (Log hesabı için)
      const oldProduct = await tx.product.findUnique({ where: { id } });
      const oldStock = oldProduct?.stock || 0;
      const stockDifference = stock - oldStock; // Yeni Stok - Eski Stok

      // 2. Ürünü Güncelle
      await tx.product.update({
        where: {
          id: id,
          tenantId: user.tenantId,
        },
        data: {
          name,
          price,
          stock,
          vatRate,
        },
      });

      // 3. Eğer stok değişmişse LOG kaydı at
      if (stockDifference !== 0) {
        await tx.inventoryLog.create({
          data: {
            productId: id,
            change: stockDifference,
            newStock: stock,
            type: "ADJUSTMENT", // Manuel Düzeltme
            note: "Ürün kartından manuel güncelleme",
            tenantId: user.tenantId,
          },
        });
      }
    });

    revalidatePath("/dashboard/products");
    redirect("/dashboard/products");
  } catch {
    return { error: "Güncellenirken hata oluştu." };
  }
}
