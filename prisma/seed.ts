// prisma/seed.ts
import 'dotenv/config' // .env dosyasını okumak için şart
import { prisma } from '../lib/db' // 👈 MERKEZİ DOSYAYI ÇAĞIRIYORUZ
import bcrypt from 'bcryptjs'

async function main() {
  console.log('🌱 Tohumlama işlemi başlıyor...')

  // 1. Önce Şirket (Tenant) oluşturulmalı
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Holding A.Ş.',
    },
  })

  console.log('✅ Şirket oluşturuldu:', tenant.name)

  // 2. Şifreyi şifrele (Hash)
  const hashedPassword = await bcrypt.hash('123456', 10)

  // 3. Admin kullanıcısını oluştur
  const user = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Sistem Yöneticisi',
      tenantId: tenant.id,
    },
  })

  console.log('✅ Kullanıcı oluşturuldu:', user.email)
  console.log('🔑 Şifreniz: 123456')
}

main()
  .catch((e) => {
    console.error('❌ Bir hata oluştu:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })