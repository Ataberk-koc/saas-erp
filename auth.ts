// auth.ts
import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      // Giriş formu alanlarımız
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        // 1. Kullanıcıyı veritabanında ara
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user) {
          throw new Error("Kullanıcı bulunamadı.")
        }

        // 2. Şifreyi kontrol et (Hash'lenmiş şifre ile karşılaştır)
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        )

        if (!isPasswordCorrect) {
          throw new Error("Şifre hatalı!")
        }

        // 3. Her şey doğruysa kullanıcıyı içeri al
        return user
      },
    }),
  ],
  pages: {
    signIn: "/login", // Kendi yaptığımız login sayfasını kullan
  },
})