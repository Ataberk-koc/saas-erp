import { DefaultSession } from "next-auth"
import { Role } from "@prisma/client"

// NextAuth modülünü genişletiyoruz
declare module "next-auth" {
  /**
   * Session (Oturum) objesine kendi alanlarımızı ekliyoruz
   */
  interface Session {
    user: {
      id: string
      tenantId: string
      role: Role
    } & DefaultSession["user"]
  }

  /**
   * User (Kullanıcı) objesine kendi alanlarımızı ekliyoruz
   */
  interface User {
    tenantId: string
    role: Role
  }
}

// JWT Token objesine de ekliyoruz
declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string
    role: Role
  }
}