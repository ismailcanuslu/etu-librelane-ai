# 🔬 ETU LibreLane AI

<div align="center">

**AI destekli Verilog tasarım ve ASIC sentez asistanı**  
*Erzurum Teknik Üniversitesi — Bitirme Projesi*

[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/Lisans-MIT-green)](#)

</div>

---

## 🎯 Proje Hakkında

**ETU LibreLane AI**, dijital devre mühendislerinin Verilog/HDL kodu yazmasını, simüle etmesini ve ASIC sentez akışını yönetmesini kolaylaştıran **yapay zeka destekli bir web arayüzüdür**. Kullanıcılar doğal dille konuşarak:

- Verilog/SystemVerilog modülleri üretebilir
- LibreLane (OpenLane tabanlı) sentez akışını başlatıp izleyebilir
- Derleme loglarını analiz edip hataları giderebilir
- Proje bazında chat geçmişini saklayabilir

---

## ✨ Özellikler

| Özellik | Açıklama |
|---|---|
| 🤖 **AI Chat** | Claude / Gemini destekli doğal dil Verilog asistanı |
| 📁 **Proje Yönetimi** | Birden fazla HDL projesini ayrı workspace olarak yönet |
| 🔨 **Build Paneli** | LibreLane sentez çıktısını gerçek zamanlı izle |
| 💬 **Chat Geçmişi** | Her projeye özel, kalıcı sohbet geçmişi |
| ⚡ **Streaming** | AI yanıtlarını akış halinde gör |
| 🌙 **Dark UI** | Göze dostu, mühendislik odaklı dark tema |
| 🔑 **API Ayarları** | API anahtarı ve model seçimi sidebar'dan yapılır |

---

## 🛠️ Teknoloji Yığını

### Frontend
| Katman | Teknoloji |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI Kütüphanesi | React 19 |
| Dil | TypeScript 5 |
| Stil | Tailwind CSS v4 |
| Bileşenler | Radix UI (Dialog, Select, Tooltip…) |
| İkonlar | Lucide React |
| State | React Hooks + localStorage |

### AI Entegrasyonu
| Sağlayıcı | Model |
|---|---|
| Anthropic | Claude Sonnet 4.6 |
| Google | Gemini (opsiyonel) |

### Arka Uç / Araçlar
- **LibreLane** — OpenLane tabanlı ASIC sentez akışı
- **Yosys** — RTL sentezi
- **nix-shell** — izole araç ortamı

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler

- Node.js ≥ 18
- npm / yarn / pnpm
- (Gerekli) LibreLane kurulu sistem

### Adımlar

```bash
# 1. Repoyu klonla
git clone https://github.com/ismailcanuslu/etu-librelane-ai.git
cd etu-librelane-ai/web

# 2. Bağımlılıkları yükle
npm install

# 3. Geliştirme sunucusunu başlat
npm run dev
```

Tarayıcıda aç: [http://localhost:3000](http://localhost:3000)

### Yapılandırma

Uygulama açıldıktan sonra sol kenar çubuğundaki **⚙️ Settings** butonuna tıklayarak:

1. **AI Sağlayıcı** seç (Claude / Gemini)
2. **API Anahtarını** gir
3. Kaydet ve sohbete başla

---

## 📁 Proje Yapısı

```
web/
├── app/
│   ├── chat/
│   │   ├── page.tsx          # Ana chat sayfası
│   │   └── layout.tsx
│   ├── layout.tsx            # Kök layout
│   └── globals.css
├── components/
│   ├── chat/
│   │   ├── ChatArea.tsx      # Ana chat konteyner bileşeni
│   │   ├── ChatHeader.tsx    # Başlık + panel sekmeleri
│   │   ├── ChatInput.tsx     # Mesaj giriş alanı
│   │   └── MessageList.tsx   # Mesaj listesi + kod bloğu render
│   ├── build/
│   │   ├── RightPanel.tsx    # Build & dosya paneli (sağ overlay)
│   │   └── BuildPanel.tsx    # Sentez çıktısı görüntüleyici
│   ├── sidebar/
│   │   └── Sidebar.tsx       # Proje listesi + ayarlar
│   └── ui/                   # Radix tabanlı temel bileşenler
├── lib/
│   ├── store.ts              # localStorage işlemleri
│   ├── mock-data.ts          # Tip tanımları + örnek veriler
│   ├── mock-fs.ts            # Sanal dosya sistemi
│   └── utils.ts              # Yardımcı fonksiyonlar
├── package.json
└── next.config.ts
```

---

## 💡 Kullanım Akışı

```
1. Sol sidebar'dan mevcut bir proje seç
   veya yeni proje oluştur (+)
        │
        ▼
2. Chat alanına Verilog isteğini yaz
   ("UART TX modülü yaz, 9600 baud…")
        │
        ▼
3. AI, Verilog kodu + config önerisi sunar
        │
        ▼
4. Sağ panel → "Build" sekmesini aç
   LibreLane sentez çıktısını izle
        │
        ▼
5. Hata varsa AI'ya logları yapıştır
   → otomatik analiz + düzeltme önerisi
```

---

## 📸 Ekran Görüntüleri

> Uygulama çalışırken ekran görüntüleri buraya eklenecek.

---

## 🛣️ Yol Haritası
- [x] Temel chat arayüzü
- [x] Proje bazlı chat geçmişi
- [x] Build log paneli
- [x] Loading göstergesi + iptal desteği
- [ ] Gerçek LLM API entegrasyonu
- [ ] LibreLane nix-shell entegrasyonu
- [ ] Dosya ağacı navigasyonu
- [ ] Diff görüntüleme (değişiklik önizleme)
- [ ] Kullanıcı kimlik doğrulama

---

## 🤝 Katkı

Bu bir bitirme projesidir. Katkı ve öneriler için issue açabilir ya da pull request gönderebilirsiniz.

---

## 📄 Lisans

MIT © 2026 — Erzurum Teknik Üniversitesi
