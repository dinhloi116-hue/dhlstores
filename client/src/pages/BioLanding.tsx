import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, ArrowUpRight, BadgeCheck, Check, ChevronRight, Copy, Download, Layers3, Shirt, ShoppingBag, Sparkles, Trophy } from "lucide-react";
import { dhlSportsLogo } from "@/lib/dhlSportsLogo";

const SITE_URL = "https://dhlstores.com";

const quickLinks = [
  {
    title: "Áo bóng đá",
    subtitle: "Áo CLB, đội tuyển, retro & player",
    href: "/products?type=physical&search=%C3%A1o%20b%C3%B3ng%20%C4%91%C3%A1",
    Icon: Shirt,
    color: "from-sky-500/30 to-blue-700/10",
    iconColor: "text-sky-200",
    badge: "ĐƯỢC QUAN TÂM",
  },
  {
    title: "Patch tay bóng đá",
    subtitle: "Patch giải đấu, patch vô địch",
    href: "/products?type=physical&search=patch",
    Icon: BadgeCheck,
    color: "from-fuchsia-500/20 to-indigo-800/10",
    iconColor: "text-fuchsia-200",
  },
  {
    title: "Nameset tên & số áo",
    subtitle: "Tên, số và phụ kiện in áo",
    href: "/products?type=physical&search=nameset",
    Icon: Layers3,
    color: "from-amber-500/20 to-orange-800/10",
    iconColor: "text-amber-200",
  },
  {
    title: "File in & thiết kế SVG",
    subtitle: "Tài nguyên thiết kế thể thao",
    href: "/products?type=digital",
    Icon: Download,
    color: "from-emerald-500/20 to-teal-800/10",
    iconColor: "text-emerald-200",
  },
] as const;

export default function BioLanding() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const oldTitle = document.title;
    document.title = "ĐHL SPORTS | Áo bóng đá, nameset, patch & file in";

    const description = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const oldDescription = description?.content;
    if (description) {
      description.content = "Tổng hợp liên kết mua áo bóng đá, patch tay, nameset và file thiết kế tại ĐHL SPORTS.";
    }

    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const oldCanonical = canonical?.href;
    if (canonical) canonical.href = SITE_URL + "/bio";

    return () => {
      document.title = oldTitle;
      if (description && oldDescription !== undefined) description.content = oldDescription;
      if (canonical && oldCanonical) canonical.href = oldCanonical;
    };
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL + "/bio");
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="relative isolate min-h-[100svh] overflow-hidden bg-[#070d1b] font-sans text-white selection:bg-cyan-400/30">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-44 -top-56 h-[560px] w-[560px] rounded-full bg-[#0875e1]/25 blur-[120px]" />
        <div className="absolute -right-52 top-48 h-[540px] w-[540px] rounded-full bg-fuchsia-700/10 blur-[110px]" />
        <div className="absolute bottom-0 left-1/2 h-[440px] w-[800px] -translate-x-1/2 rounded-full bg-sky-900/15 blur-[110px]" />
        <div className="absolute inset-0 opacity-[0.075]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)", backgroundSize: "38px 38px", maskImage: "linear-gradient(to bottom,black,transparent 85%)" }} />
      </div>

      <div className="relative mx-auto w-full max-w-[540px] px-5 pb-10 pt-7 sm:px-8 sm:pt-10">
        <header className="flex items-center justify-between">
          <a href={SITE_URL} className="flex items-center gap-2.5 rounded-full text-white/80 transition hover:text-white" aria-label="Trang chủ DHL Stores">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-300/25 bg-sky-500/15 font-display text-[16px] font-black italic text-sky-200">D</span>
            <span className="font-display text-xl font-black italic tracking-tight">ĐHL <span className="text-sky-400">SPORTS</span></span>
          </a>
          <button type="button" onClick={copyLink} aria-label="Sao chép liên kết trang bio" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 text-xs font-semibold text-white/80 transition hover:border-white/30 hover:bg-white/10">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Đã sao chép" : "Sao chép link"}
          </button>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-[30px] border border-white/15 bg-gradient-to-b from-[#172d54] via-[#0d1b35] to-[#0b1427] px-6 pb-7 pt-7 text-center shadow-[0_25px_80px_-32px_rgba(0,0,0,.85)] sm:px-8">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full border-[1px] border-sky-300/20" />
            <div className="absolute -right-9 -top-16 h-44 w-44 rounded-full border border-sky-300/15" />
            <div className="absolute left-1/2 top-0 h-28 w-3/4 -translate-x-1/2 bg-sky-400/15 blur-[55px]" />
            <div className="absolute -bottom-28 left-1/2 h-52 w-96 -translate-x-1/2 rounded-full bg-blue-500/15 blur-[65px]" />
          </div>

          <div className="relative mx-auto h-[104px] w-[104px] rounded-[27px] bg-gradient-to-tr from-[#47d6ff] via-[#0072f5] to-[#5b53ec] p-[2px] shadow-[0_14px_42px_-12px_rgba(59,130,246,.7)]">
            <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[25px] bg-[#0e1931]">
              <img src={dhlSportsLogo} alt="Logo ĐHL SPORTS" className="h-full w-full object-contain p-2" />
            </div>
          </div>

          <div className="relative mt-5 inline-flex items-center gap-1.5 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-cyan-200">
            <Sparkles size={12} /> Football culture · design · lifestyle
          </div>

          <h1 className="font-display relative mt-4 text-[43px] font-black italic leading-[0.96] tracking-tight sm:text-[49px]">
            ĐHL <span className="text-[#54c9ff]">SPORTS</span>
          </h1>
          <p className="relative mt-3 text-[13px] font-semibold tracking-wide text-white/65">ÁO BÓNG ĐÁ · NAMESET · PATCH · FILE IN</p>
          <p className="relative mx-auto mt-4 max-w-[330px] text-[13px] leading-6 text-slate-300">
            Một nơi cho mọi thứ anh em cần để build chiếc áo bóng đá mình thích.
          </p>

          <a href={SITE_URL + "/products"} className="relative mt-6 inline-flex min-h-[51px] w-full items-center justify-center gap-2 rounded-2xl bg-[#45c7ff] px-5 text-sm font-extrabold text-[#071326] shadow-[0_12px_28px_-12px_rgba(56,189,248,.7)] transition hover:bg-[#7bdcff]">
            <ShoppingBag size={18} /> XEM TẤT CẢ SẢN PHẨM <ArrowUpRight size={17} />
          </a>
        </section>

        <div className="mt-8 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,.6)]" />
            <h2 className="text-xs font-extrabold uppercase tracking-[0.17em] text-white/80">KHÁM PHÁ DANH MỤC</h2>
          </div>
          <span className="text-[11px] text-white/40">Chạm để xem</span>
        </div>

        <nav aria-label="Liên kết danh mục sản phẩm" className="mt-3.5 space-y-3">
          {quickLinks.map(({ title, subtitle, href, Icon, color, iconColor, ...rest }) => (
            <Link key={title} href={href} className="group relative flex min-h-[85px] items-center gap-4 overflow-hidden rounded-[20px] border border-white/10 bg-[#101b30]/95 px-4 py-3.5 shadow-[0_8px_25px_-20px_rgba(0,0,0,.9)] transition hover:-translate-y-[2px] hover:border-sky-300/35 hover:bg-[#14243d] active:scale-[0.99]">
              <div className={"flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-gradient-to-br " + color}>
                <Icon size={25} strokeWidth={1.8} className={iconColor} />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[22px] font-bold leading-tight tracking-tight text-white">{title}</span>
                <span className="mt-1 block text-[11px] leading-5 text-slate-400">{subtitle}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-sky-300/65 transition group-hover:translate-x-1 group-hover:text-sky-200" />
              {"badge" in rest && <span className="absolute right-2 top-1 rounded-full bg-sky-300/10 px-2 py-0.5 text-[8px] font-extrabold tracking-wide text-sky-300">PHỔ BIẾN</span>}
            </Link>
          ))}
        </nav>

        <a href={SITE_URL} className="group mt-5 flex min-h-[66px] items-center justify-between gap-3 rounded-[18px] border border-dashed border-white/20 bg-white/[0.035] px-5 transition hover:border-sky-300/50 hover:bg-white/[0.07]">
          <span className="flex items-center gap-3">
            <Trophy size={22} className="text-sky-300" />
            <span className="text-left"><span className="block text-sm font-bold">DHL STORES</span><span className="block text-[11px] text-white/50">Truy cập website chính</span></span>
          </span>
          <ArrowRight size={19} className="text-white/55 transition group-hover:translate-x-1" />
        </a>

        <p className="mx-auto mt-6 max-w-[380px] text-center text-[12px] leading-6 text-slate-400">
          Tìm mẫu áo, patch hoặc nameset? Chọn danh mục phía trên để xem sản phẩm đang có trên website.
        </p>

        <footer className="mt-9 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center">
          <span className="font-display text-lg font-black italic tracking-wide text-white/65">ĐHL <span className="text-sky-400">SPORTS</span></span>
          <span className="text-[10px] tracking-wider text-white/35">DHLSTORES.COM</span>
        </footer>
      </div>
    </main>
  );
}
