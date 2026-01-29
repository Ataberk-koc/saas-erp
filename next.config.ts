import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 👇 Iyzico gibi eski kütüphaneleri derlemeyip dışarıda bırakıyoruz
  serverExternalPackages: ["iyzipay"],
};

export default nextConfig;