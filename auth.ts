/* eslint-disable @typescript-eslint/ban-ts-comment */
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Kullanıcıyı bul
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        // Kullanıcı yoksa veya şifresi yoksa (sadece Google ile girdiyse)
        if (!user || !user.password) {
          throw new Error("Kullanıcı bulunamadı veya şifre oluşturulmamış.");
        }

        // Şifreyi kontrol et
        const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) {
          throw new Error("Şifre hatalı!");
        }

        return user;
      }
    })
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        // @ts-ignore
        session.user.tenantId = token.tenantId as string;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        // @ts-ignore
        token.tenantId = user.tenantId;
      }
      return token;
    }
  }
})