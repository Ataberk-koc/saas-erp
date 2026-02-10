"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { sanitizeInput } from "@/lib/utils";

export async function registerAction(formData: FormData) {
  const name = sanitizeInput(formData.get("name") as string);
  const companyName = sanitizeInput(formData.get("companyName") as string);
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!name || !companyName || !email || !password) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  // 1. Bu email ile kayıtlı kullanıcı var mı kontrol et
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return { error: "Bu e-posta adresi zaten kullanılıyor." };
  }

  // 2. Şifreyi şifrele (Hash)
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    // 3. TRANSACTION: Hem Tenant'ı hem User'ı aynı anda oluştur
    // Biri başarısız olursa diğerini de iptal et (Veri güvenliği için şart)
    await prisma.$transaction(async (tx) => {
      
      // A) Şirketi (Tenant) oluştur
      const newTenant = await tx.tenant.create({
        data: {
          name: companyName,
          // İlk oluşturulduğunda FREE planda başlasın
          plan: "FREE", 
        },
      });

      // B) Kullanıcıyı oluştur ve Tenant'a bağla
      await tx.user.create({
        data: {
          name: name,
          email: email,
          password: hashedPassword,
          role: "ADMIN", // İlk kayıt olan patron olur
          tenantId: newTenant.id, // 👈 İşte sihirli değnek burada!
        },
      });
    });

  } catch (error) {
    console.error("Kayıt hatası:", error);
    return { error: "Kayıt oluşturulurken bir hata oluştu." };
  }

  // 4. Başarılı ise giriş sayfasına yönlendir
  redirect("/login?registered=true");
}