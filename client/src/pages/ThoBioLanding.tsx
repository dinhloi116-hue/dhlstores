import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Flower2, Gift, Globe2, Heart, MessageCircle, ShoppingBag, Video } from "lucide-react";

const URLS = {
  shop: "https://thohandmade-ggpkyvkt.manus.space",
  shopee: "https://s.shopee.vn/9pfSXI62mJ",
  zalo: "https://dinhloi116-hue.github.io/dhlstores/zalo.html",
  whatsapp: "https://wa.me/84399865463",
  tiktok: "https://www.tiktok.com/@thohandmade2024",
};
type Language = "vi" | "en";

const copy = {
  vi: {
    headline: "THỎ HANDMADE",
    subtitle: "Hoa kẽm nhung · Quà tặng handmade · Ý tưởng DIY",
    intro: "Những món quà thủ công nhỏ xinh, được làm bằng sự tỉ mỉ và yêu thương.",
    linksTitle: "MUA HÀNG & LIÊN HỆ",
    linksHint: "Chọn nơi bạn muốn đến",
    zaloTitle: "Mua qua Zalo", zaloDescription: "Nhắn trực tiếp cho em ạ 💬",
    whatsappTitle: "Mua qua WhatsApp", whatsappDescription: "Khách quốc tế nhắn em để nhận giá USD và tư vấn giao hàng",
    shopeeTitle: "Mua trên Shopee", shopeeDescription: "Có ưu đãi freeship, giá nhỉnh hơn website",
    webTitle: "Mua tại website", webDescription: "Toàn bộ sản phẩm • Giá rẻ bất ngờ!",
    tiktokTitle: "Xem TikTok", tiktokDescription: "Video làm hoa và ý tưởng thủ công",
    priceTitle: "Giá cho khách quốc tế",
    priceText: "Nhắn WhatsApp để nhận báo giá bằng USD ($) và phí vận chuyển. Giá từng mẫu chưa được niêm yết trên trang bio này.",
    footer: "Mỗi món quà đều mang một câu chuyện nhỏ",
  },
  en: {
    headline: "THO HANDMADE",
    subtitle: "Chenille flowers · Handmade gifts · DIY ideas",
    intro: "Thoughtfully crafted flowers and gifts, handmade with love in Vietnam.",
    linksTitle: "SHOP & GET IN TOUCH",
    linksHint: "Choose how to order",
    zaloTitle: "Order via Zalo", zaloDescription: "Message me directly for personal assistance",
    whatsappTitle: "Order via WhatsApp", whatsappDescription: "International orders • Chat in English, get a USD quote",
    shopeeTitle: "Shop on Shopee", shopeeDescription: "Free-shipping offers • Prices slightly higher than our website",
    webTitle: "Shop our website", webDescription: "All products • Surprisingly low prices!",
    tiktokTitle: "Watch our TikTok", tiktokDescription: "Flower tutorials and handmade ideas",
    priceTitle: "Prices in USD",
    priceText: "Contact us on WhatsApp for USD ($) quotations and international shipping. Individual product prices are not listed on this bio page.",
    footer: "Every handmade gift tells a little story",
  },
} as const;

const LANGUAGE_KEY = "tho_handmade_bio_language";
const COUNTRY_CACHE_KEY = "tho_handmade_bio_country_cache";
const COUNTRY_CACHE_MS = 12 * 60 * 60 * 1000;
const safeGet = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const safeSet = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} };
const isLanguage = (value: string | null): value is Language => value === "vi" || value === "en";

export default function ThoBioLanding() {
  const manuallySelected = useRef(false);
  const [lang, setLang] = useState<Language>(() => {
    const forced = new URLSearchParams(window.location.search).get("lang");
    if (isLanguage(forced)) return forced;
    const saved = safeGet(LANGUAGE_KEY);
    if (isLanguage(saved)) return saved;
    return (navigator.languages?.[0] || navigator.language || "").toLowerCase().startsWith("vi") ? "vi" : "en";
  });

  const changeLanguage = (language: Language) => {
    manuallySelected.current = true;
    safeSet(LANGUAGE_KEY, language);
    setLang(language);
  };

  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("lang");
    if (isLanguage(forced) || isLanguage(safeGet(LANGUAGE_KEY))) return;

    let cancelled = false;
    const cache = safeGet(COUNTRY_CACHE_KEY);
    if (cache) {
      try {
        const stored = JSON.parse(cache) as { country?: string; time?: number };
        if (/^[A-Z]{2}$/.test(stored.country || "") && typeof stored.time === "number" && Date.now() - stored.time < COUNTRY_CACHE_MS) {
          setLang(stored.country === "VN" ? "vi" : "en");
          return;
        }
      } catch { /* Invalid cache; look up the country again. */ }
    }

    const lookup = async (url: string, pick: (data: any) => string | null) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 2600);
      try {
        const response = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Country lookup unavailable");
        const country = pick(await response.json());
        if (!/^[A-Z]{2}$/.test(country || "")) throw new Error("Unknown country");
        return country as string;
      } finally { window.clearTimeout(timeout); }
    };

    const detect = async () => {
      let country: string | null = null;
      try { country = await lookup("https://api.country.is/", data => data.country); }
      catch {
        try { country = await lookup("https://ipwho.is/", data => data.success === false ? null : data.country_code); }
        catch { /* Preserve browser language if both services fail. */ }
      }
      if (!country || cancelled || manuallySelected.current) return;
      safeSet(COUNTRY_CACHE_KEY, JSON.stringify({ country, time: Date.now() }));
      setLang(country === "VN" ? "vi" : "en");
    };
    void detect();
    return () => { cancelled = true; };
  }, []);

  const t = copy[lang];
  const [zaloCopyStatus, setZaloCopyStatus] = useState<"idle" | "done" | "failed">("idle");
  const copyZaloNumber = async () => {
    const number = "0399865463";
    let success = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(number);
        success = true;
      }
    } catch { /* In-app browsers may block Clipboard API. */ }
    if (!success) {
      const input = document.createElement("textarea");
      input.value = number;
      input.style.cssText = "position:fixed;opacity:0;top:0;left:0";
      document.body.appendChild(input);
      input.focus();
      input.select();
      try { success = document.execCommand("copy"); } catch { /* Show manual copy hint. */ }
      input.remove();
    }
    setZaloCopyStatus(success ? "done" : "failed");
  };


  useEffect(() => {
    const originalTitle = document.title;
    const originalLang = document.documentElement.lang;
    document.title = lang === "vi" ? "Thỏ Handmade | Hoa kẽm nhung & quà tặng" : "Tho Handmade | Chenille flowers & handmade gifts";
    document.documentElement.lang = lang;
    return () => { document.title = originalTitle; document.documentElement.lang = originalLang; };
  }, [lang]);

  const links = [
    { href: URLS.shop, title: t.webTitle, description: t.webDescription, Icon: Flower2, highlight: true },
    { href: URLS.shopee, title: t.shopeeTitle, description: t.shopeeDescription, Icon: ShoppingBag, brandIcon: "https://cdn.simpleicons.org/shopee/EE4D2D" },
    { href: URLS.zalo, title: t.zaloTitle, description: t.zaloDescription, Icon: MessageCircle, brandIcon: "https://cdn.simpleicons.org/zalo/0068FF" },
    { href: URLS.whatsapp, title: t.whatsappTitle, description: t.whatsappDescription, Icon: Globe2, brandIcon: "https://cdn.simpleicons.org/whatsapp/25D366" },
    { href: URLS.tiktok, title: t.tiktokTitle, description: t.tiktokDescription, Icon: Video },
  ];

  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-[#fff8f6] font-sans text-[#493334]">
      <div className="pointer-events-none absolute -left-44 -top-48 h-[490px] w-[490px] rounded-full bg-[#fbdde8]/75 blur-[80px]" />
      <div className="pointer-events-none absolute -right-48 top-8 h-[440px] w-[440px] rounded-full bg-[#f9e9c9]/65 blur-[80px]" />
      <div className="relative mx-auto w-full max-w-[530px] px-5 pb-10 pt-6 sm:px-8 sm:pt-9">
        <header className="flex items-center justify-between gap-3">
          <span className="text-[17px] font-extrabold tracking-tight">THỎ <span className="text-[#c4607f]">HANDMADE</span> ✿</span>
          <div className="inline-flex rounded-full border border-[#eacdd2] bg-[#fff9fa] p-1" aria-label="Language">
            {(["vi", "en"] as const).map((option) => (
              <button key={option} type="button" onClick={() => changeLanguage(option)} aria-pressed={lang === option}
                className={"rounded-full px-3 py-1.5 text-xs font-extrabold transition " + (lang === option ? "bg-[#d56c90] text-white shadow-sm" : "text-[#9d6c78] hover:bg-white")}>{option === "vi" ? "VN" : "EN"}</button>
            ))}
          </div>
        </header>

        <section className="relative mt-6 overflow-hidden rounded-[30px] border border-[#f1d6dd] bg-gradient-to-br from-white to-[#fff0f4] px-5 pb-7 pt-8 text-center shadow-[0_12px_42px_rgba(159,103,113,.13)]">
          <Flower2 aria-hidden="true" size={140} strokeWidth={0.7} className="pointer-events-none absolute -right-9 -top-10 rotate-12 text-[#edb6c3]/30" />
          <div className="relative mx-auto flex h-[96px] w-[96px] items-center justify-center rounded-[26px] bg-gradient-to-br from-[#f5aabd] to-[#d66f99] text-[48px] shadow-[0_12px_25px_#c4607f40]" role="img" aria-label="Rabbit">🐰</div>
          <p className="relative mx-auto mt-5 w-max rounded-full border border-[#f1d2da] bg-[#fff5f7] px-3 py-1.5 text-[10px] font-extrabold tracking-widest text-[#ad5875]">HANDMADE WITH LOVE ✨</p>
          <h1 className="relative mt-4 text-[35px] font-extrabold tracking-tighter sm:text-[39px]">{t.headline}</h1>
          <p className="relative mt-1 text-xs font-bold text-[#b56a84]">{t.subtitle}</p>
          <p className="relative mx-auto mt-3 max-w-[330px] text-[13px] leading-6 text-[#8f7379]">{t.intro}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] font-bold text-[#b56a84]">
            <span className="rounded-full border border-[#f0d5dc] bg-white/70 px-3 py-2">🌷 {lang === "vi" ? "Hoa kẽm nhung" : "Chenille flowers"}</span>
            <span className="rounded-full border border-[#f0d5dc] bg-white/70 px-3 py-2">🎁 {lang === "vi" ? "Quà tặng" : "Gifts"}</span>
            <span className="rounded-full border border-[#f0d5dc] bg-white/70 px-3 py-2">✂️ DIY</span>
          </div>
        </section>

        <div className="mb-3 mt-8 flex items-center justify-between gap-2 px-1">
          <h2 className="text-xs font-extrabold tracking-[0.14em]">{t.linksTitle}</h2>
          <span className="text-[11px] text-[#af8d95]">{t.linksHint}</span>
        </div>
        <nav aria-label={t.linksTitle} className="space-y-3">
          {links.map(({ href, title, description, Icon, highlight, ...brand }) => (
            href === URLS.zalo ? (
              <div key={href} role="group" aria-label="Zalo" className="flex flex-wrap items-center gap-3 rounded-[20px] border border-[#f3dfe1] bg-white px-4 py-3.5 shadow-[0_5px_20px_rgba(110,60,70,.05)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#fff0f4]">
                  <img src="https://cdn.simpleicons.org/zalo/0068FF" width={27} height={27} alt="Zalo" className="h-[27px] w-[27px] object-contain" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block text-[15px] font-extrabold">{title}</strong>
                  <small className="mt-1 block text-[11px] leading-5 text-[#927e83]">{description}</small>
                  <span className="mt-1 block text-sm font-extrabold tracking-wide text-[#0068ff]">0399 865 463</span>
                </span>
                <button type="button" onClick={copyZaloNumber} aria-label={lang === "vi" ? "Sao chép số Zalo" : "Copy Zalo number"} className="shrink-0 rounded-xl border border-[#c5dcff] bg-[#ecf5ff] px-3 py-2.5 text-xs font-extrabold text-[#1763cf]">
                  {lang === "vi" ? "Sao chép" : "Copy"}
                </button>
                {zaloCopyStatus !== "idle" && (
                  <span role="status" aria-live="polite" className="w-full text-center text-[11px] text-[#3c7b53]">
                    {zaloCopyStatus === "done"
                      ? (lang === "vi" ? "✓ Đã sao chép số — mở Zalo để tìm shop." : "✓ Number copied — search in Zalo.")
                      : (lang === "vi" ? "Giữ vào số bên trên để sao chép thủ công." : "Long-press the number to copy it.")}
                  </span>
                )}
              </div>
            ) : (
              <a key={href} href={href} target="_blank" rel="noopener noreferrer"
                className={"group flex min-h-[78px] items-center gap-3.5 rounded-[20px] border px-4 py-3.5 shadow-[0_5px_20px_rgba(110,60,70,.05)] transition hover:-translate-y-0.5 " + (highlight ? "border-[#c85d83] bg-gradient-to-r from-[#d96d91] to-[#c65b80] text-white shadow-[0_12px_26px_#c35f8240]" : "border-[#f3dfe1] bg-white text-[#493334] hover:border-[#ebb3c4]")}>
                <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " + (highlight ? "bg-white/20" : "bg-[#fff0f4]")}>{"brandIcon" in brand && typeof brand.brandIcon === "string" ? <img src={brand.brandIcon} width={27} height={27} alt={title} className="h-[27px] w-[27px] object-contain" /> : <Icon size={23} strokeWidth={1.8} />}</span>
                <span className="min-w-0 flex-1"><strong className="block text-[15px] font-extrabold">{title}</strong><small className={"mt-1 block text-[11px] leading-5 " + (highlight ? "text-[#ffecf1]" : "text-[#927e83]")}>{description}</small></span>
                <ArrowUpRight size={20} className={highlight ? "text-white" : "text-[#bf7791]"} />
              </a>
            )
          ))}    ))}
        </nav>

        <aside className="mt-6 rounded-[18px] border border-dashed border-[#ebcbd2] bg-white/75 px-4 py-4 text-[12px] leading-6 text-[#8e7479]">
          <div className="mb-1 flex items-center gap-2 font-extrabold text-[#ae5c7b]"><Heart size={16} />{t.priceTitle}</div>
          {t.priceText}
        </aside>
        <footer className="mt-9 border-t border-[#f0dcdf] pt-6 text-center">
          <p className="text-base font-extrabold text-[#b95a7e]">THỎ HANDMADE ♡</p>
          <p className="mt-1 text-[11px] text-[#af8c96]">{t.footer}</p>
        </footer>
      </div>
    </main>
  );
}
