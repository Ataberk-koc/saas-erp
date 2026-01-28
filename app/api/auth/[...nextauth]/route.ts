// app/api/auth/[...nextauth]/route.ts

import { handlers } from "@/auth" // Az önce oluşturduğumuz auth.ts dosyasından çekiyoruz

export const { GET, POST } = handlers