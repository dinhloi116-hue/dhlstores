import { useEffect, useState } from "react";
import { ArrowUpRight, Flower2, Gift, Globe2, Heart, MessageCircle, ShoppingBag, Video } from "lucide-react";

const URLS = {
  shop: "https://thohandmade-ggpkyvkt.manus.space",
  shopee: "https://s.shopee.vn/9pfSXI62mJ",
  zalo: "https://zalo.me/0399865463",
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
    zaloTitle: "Mua qua Zalo", zaloDescription: "Nhắn shop để đặt mẫu hoặc làm theo yêu cầu",
    whatsappTitle: "Mua bằng WhatsApp", whatsappDescription: "Liên hệ đặt hàng quốc tế",
    shopeeTitle: "Mua trên Shopee", shopeeDescription: "Xem các sản phẩm đang bán",
    webTitle: "Website Thỏ Handmade", webDescription: "Khám phá các mẫu hoa và quà tặng",
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
    zaloTitle: "Order via Zalo", zaloDescription: "Message us for custom designs and orders",
    whatsappTitle: "Order via WhatsApp", whatsappDescription: "English support for international orders",
    shopeeTitle: "Shop on Shopee", shopeeDescription: "Browse our products on Shopee",
    webTitle: "Visit Tho Handmade", webDescription: "Explore our flowers and handmade gifts",
    tiktokTitle: "Watch our TikTok", tiktokDescription: "Flower tutorials and handmade ideas",
    priceTitle: "Prices in USD",
    priceText: "Contact us on WhatsApp for USD ($) quotations and international shipping. Individual product prices are not listed on this bio page.",
    footer: "Every handmade gift tells a little story",
  },
} as const;

export default function ThoBioLanding() {
  const [lang, setLang] = useState<Language>(() => {
    const query = new URLSearchParams(window.location.search).get("lang");
    if (query === "vi" || query === "en") return query;
    return navigator.language.toLowerCase().startsWith("vi") ? "vi" : "en";
  });
  const t = copy[lang];

  useEffect(() => {
    const originalTitle = document.title;
    const originalLang = document.documentElement.lang;
    document.title = lang === "vi" ? "Thỏ Handmade | Hoa kẽm nhung & quà tặng" : "Tho Handmade | Chenille flowers & handmade gifts";
    document.documentElement.lang = lang;
    return () => { document.title = originalTitle; document.documentElement.lang = originalLang; };
  }, [lang]);

  const links = [
    { href: URLS.zalo, title: t.zaloTitle, description: t.zaloDescription, Icon: MessageCircle, highlight: true },
    { href: URLS.whatsapp, title: t.whatsappTitle, description: t.whatsappDescription, Icon: Globe2 },
    { href: URLS.shopee, title: t.shopeeTitle, description: t.shopeeDescription, Icon: ShoppingBag },
    { href: URLS.shop, title: t.webTitle, description: t.webDescription, Icon: Flower2 },
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
              <button key={option} type="button" onClick={() => setLang(option)} aria-pressed={lang === option}
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
          {links.map(({ href, title, description, Icon, highlight }) => (
            <a key={href} href={href} target="_blank" rel="noopener noreferrer"
              className={"group flex min-h-[78px] items-center gap-3.5 rounded-[20px] border px-4 py-3.5 shadow-[0_5px_20px_rgba(110,60,70,.05)] transition hover:-translate-y-0.5 " + (highlight ? "border-[#c85d83] bg-gradient-to-r from-[#d96d91] to-[#c65b80] text-white shadow-[0_12px_26px_#c35f8240]" : "border-[#f3dfe1] bg-white text-[#493334] hover:border-[#ebb3c4]")}>
              <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " + (highlight ? "bg-white/20" : "bg-[#fff0f4]")}><Icon size={23} strokeWidth={1.8} /></span>
              <span className="min-w-0 flex-1"><strong className="block text-[15px] font-extrabold">{title}</strong><small className={"mt-1 block text-[11px] leading-5 " + (highlight ? "text-[#ffecf1]" : "text-[#927e83]")}>{description}</small></span>
              <ArrowUpRight size={20} className={highlight ? "text-white" : "text-[#bf7791]"} />
            </a>
          ))}
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
