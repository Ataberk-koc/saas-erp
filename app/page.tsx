import { auth } from "@/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BrainCircuit,
  Globe,
  Rocket,
  Zap,
  CheckCircle2,
  UserPlus,
  FileText,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Not: scroll-smooth özelliği html etiketinde olmalı, 
          ama layout.tsx'e dokunmadan burada style veriyoruz */}
      <style>{`html { scroll-behavior: smooth; }`}</style>

      {/* --- HEADER (Üst Menü) --- */}
      <header className="px-6 py-4 flex items-center justify-between bg-white border-b sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Rocket className="text-white h-5 w-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            NEXURA
          </span>
        </div>

        {/* 👇 DÜZELTME: Link yerine 'a' etiketi kullandık ki scroll kesin çalışsın */}
        <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
          <a
            href="#how-it-works"
            className="hover:text-purple-600 transition cursor-pointer"
          >
            Nasıl Çalışır?
          </a>
          <a
            href="#features"
            className="hover:text-purple-600 transition cursor-pointer"
          >
            Özellikler
          </a>
          <a
            href="#contact"
            className="hover:text-purple-600 transition cursor-pointer"
          >
            İletişim
          </a>
        </nav>

        <div className="flex gap-3">
          {session ? (
            <Link href="/dashboard">
              <Button className="bg-purple-600 hover:bg-purple-700">
                Dashboard&apos;a Git <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Giriş Yap</Button>
              </Link>
              <Link href="/register">
                {" "}
                {/* 👈 Linki register yaptık */}
                <Button
                  size="lg"
                  className="bg-white text-blue-600 hover:bg-slate-100"
                >
                  Ücretsiz Dene
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 bg-linear-to-b from-white to-slate-100">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-semibold mb-6">
          <BrainCircuit className="h-4 w-4" /> Yapay Zeka Destekli Finans
          Yönetimi
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 leading-tight max-w-4xl mb-6">
          KOBİ&apos;lerin Yeni Nesil <br />
          <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-blue-600">
            Dijital CFO&apos;su
          </span>
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed">
          Karmaşık muhasebe programlarını unutun. Yapay zeka ile konuşarak
          finansal durumunuzu öğrenin, tek tıkla fatura kesin ve işinizi
          cebinizden yönetin.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href={session ? "/dashboard" : "/login"}>
            <Button
              size="lg"
              className="bg-purple-600 hover:bg-purple-700 h-12 px-8 text-lg shadow-lg shadow-purple-200"
            >
              {session ? "İşletmene Dön" : "Hemen Başla"}
            </Button>
          </Link>

          <a href="#how-it-works">
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
              Nasıl Çalışır?
            </Button>
          </a>
        </div>
      </section>

      {/* --- NASIL ÇALIŞIR? --- */}
      {/* 👇 DÜZELTME: scroll-mt-28 ekledik ki başlık menünün altında kalmasın */}
      <section id="how-it-works" className="py-20 px-6 bg-white scroll-mt-28">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              3 Adımda Sisteminizi Kurun
            </h2>
            <p className="text-slate-600">
              Teknik bilgi gerekmez. Sadece 5 dakikanızı ayırın.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            <div className="hidden md:block absolute top-12 left-0 w-full h-1 bg-slate-100 -z-10"></div>

            {/* Adım 1 */}
            <div className="flex flex-col items-center text-center bg-white p-4">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-200 z-10">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Ücretsiz Kayıt Ol</h3>
              <p className="text-slate-600 text-sm">
                Google hesabınızla saniyeler içinde giriş yapın. Kurulum veya
                kredi kartı gerekmez.
              </p>
            </div>

            {/* Adım 2 */}
            <div className="flex flex-col items-center text-center bg-white p-4">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-200 z-10">
                <UserPlus className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Müşterini Ekle</h3>
              <p className="text-slate-600 text-sm">
                Çalıştığınız firmaları veya kişileri sisteme kaydedin. WhatsApp
                numaralarını girin.
              </p>
            </div>

            {/* Adım 3 */}
            <div className="flex flex-col items-center text-center bg-white p-4">
              <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg shadow-purple-200 z-10">
                <FileText className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-2">Fatura Kes & Yönet</h3>
              <p className="text-slate-600 text-sm">
                Profesyonel faturalar oluşturun ve &quot;Ciro ne kadar?&quot;
                diye yapay zekaya sorun.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- ÖZELLİKLER --- */}
      {/* 👇 DÜZELTME: scroll-mt-28 eklendi */}
      <section
        id="features"
        className="py-20 px-6 max-w-6xl mx-auto border-t border-slate-100 scroll-mt-28"
      >
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">
            Neden Logo Yerine Biz?
          </h2>
          <p className="text-slate-600">
            Geleneksel yazılımların hantallığını attık, modern teknolojiyi
            getirdik.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-slate-50 p-8 rounded-2xl hover:bg-white hover:shadow-lg transition border border-transparent hover:border-slate-100">
            <BrainCircuit className="text-purple-600 h-10 w-10 mb-4" />
            <h3 className="text-xl font-bold mb-2">Yapay Zeka Asistanı</h3>
            <p className="text-slate-600 text-sm">
              Raporlarla boğuşmayın. Asistanınız verileri okusun, size özet
              geçsin ve uyarılarını yapsın.
            </p>
          </div>

          <div className="bg-slate-50 p-8 rounded-2xl hover:bg-white hover:shadow-lg transition border border-transparent hover:border-slate-100">
            <Globe className="text-green-600 h-10 w-10 mb-4" />
            <h3 className="text-xl font-bold mb-2">%100 Bulut Tabanlı</h3>
            <p className="text-slate-600 text-sm">
              Ofise bağlı kalmayın. Dünyanın her yerinden, her cihazdan işinizi
              yönetme özgürlüğü.
            </p>
          </div>

          <div className="bg-slate-50 p-8 rounded-2xl hover:bg-white hover:shadow-lg transition border border-transparent hover:border-slate-100">
            <Zap className="text-orange-600 h-10 w-10 mb-4" />
            <h3 className="text-xl font-bold mb-2">Hızlı & Kolay</h3>
            <p className="text-slate-600 text-sm">
              Eğitim gerektirmeyen, Instagram kullanmak kadar kolay ve anlaşılır
              modern arayüz.
            </p>
          </div>
        </div>
      </section>
      <section id="pricing" className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Her İşletmeye Uygun Paketler
            </h2>
            <p className="text-slate-600">
              Gizli ücret yok. İstediğiniz zaman iptal edin.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 items-start">
            {/* PAKET 1: BAŞLANGIÇ */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Başlangıç</h3>
              <div className="my-4">
                <span className="text-4xl font-bold text-slate-900">₺0</span>
                <span className="text-slate-500">/ay</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Yeni başlayanlar için ideal.
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full mb-6">
                  Hemen Başla
                </Button>
              </Link>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Ayda 5
                  Fatura
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> 10 Müşteri
                  Kaydı
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-300" />{" "}
                  <span className="text-slate-400 line-through">
                    AI Asistan
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-300" />{" "}
                  <span className="text-slate-400 line-through">
                    WhatsApp Entegrasyonu
                  </span>
                </li>
              </ul>
            </div>

            {/* PAKET 2: PRO (ÖNERİLEN) */}
            <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-purple-600 relative scale-105 transform">
              <div className="absolute top-0 right-0 bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg rounded-tr-lg">
                EN POPÜLER
              </div>
              <h3 className="text-xl font-bold text-purple-600">Pro Paket</h3>
              <div className="my-4">
                <span className="text-4xl font-bold text-slate-900">₺299</span>
                <span className="text-slate-500">/ay</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">
                Büyüyen işletmeler için.
              </p>
              <Link href="/login">
                <Button className="w-full mb-6 bg-purple-600 hover:bg-purple-700">
                  Ücretsiz Dene
                </Button>
              </Link>
              <ul className="space-y-3 text-sm text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" /> Sınırsız
                  Fatura
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" /> Sınırsız
                  Müşteri
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" /> ✨ Gemini
                  AI Analiz
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-600" /> WhatsApp
                  Butonu
                </li>
              </ul>
            </div>

            {/* PAKET 3: KURUMSAL */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Kurumsal</h3>
              <div className="my-4">
                <span className="text-4xl font-bold text-slate-900">₺999</span>
                <span className="text-slate-500">/ay</span>
              </div>
              <p className="text-sm text-slate-500 mb-6">Büyük ekipler için.</p>
              <Link href="#contact">
                <Button variant="outline" className="w-full mb-6">
                  İletişime Geç
                </Button>
              </Link>
              <ul className="space-y-3 text-sm text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Her şey
                  sınırsız
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Çoklu
                  Kullanıcı
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Özel
                  Destek Hattı
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" /> Özel
                  Yedekleme
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* --- İLETİŞİM (CONTACT) BÖLÜMÜ --- */}
      {/* 👇 DÜZELTME: id="contact" kesin olarak burada */}
      <section
        id="contact"
        className="py-20 px-6 bg-slate-900 text-white scroll-mt-20"
      >
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-8">Bizimle İletişime Geçin</h2>
          <p className="text-slate-400 mb-12">
            Sorularınız mı var? Ekibimiz size yardımcı olmaktan mutluluk duyar.
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-slate-800 p-6 rounded-xl hover:bg-slate-700 transition">
              <Mail className="h-8 w-8 text-purple-400 mx-auto mb-4" />
              <h3 className="font-bold mb-2">E-Posta</h3>
              <p className="text-sm text-slate-300">destek@ataerp.com</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl hover:bg-slate-700 transition">
              <Phone className="h-8 w-8 text-green-400 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Telefon</h3>
              <p className="text-sm text-slate-300">+90 (212) 123 45 67</p>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl hover:bg-slate-700 transition">
              <MapPin className="h-8 w-8 text-red-400 mx-auto mb-4" />
              <h3 className="font-bold mb-2">Ofis</h3>
              <p className="text-sm text-slate-300">İstanbul, Türkiye</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 text-slate-500 py-8 text-center text-sm border-t border-slate-800">
        <p>&copy; 2026 ATA ERP Yazılım A.Ş. Tüm hakları saklıdır.</p>
      </footer>
    </div>
  );
}
