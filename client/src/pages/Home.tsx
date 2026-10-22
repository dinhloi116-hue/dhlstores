import { useEffect, useMemo, useState } from "react";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { catalogName } from "@/lib/catalogLocale";
import { Button } from "@/components/ui/button";
import { getCategoryIcon } from "@/lib/category-icons";
import { ArrowRight, Camera, ChevronRight, Download, Flame, History, PackageCheck, Search, ShieldCheck, Sparkles, Truck, X, Zap } from "lucide-react";
import { clearRecentProducts, getRecentProductIds } from "@/lib/customer-tools";
import { isRenderableImageUrl } from "@/lib/image";
import { formatLocalizedPrice } from "@/lib/pricing";

const CATEGORY_RAIL_FALLBACKS = [
  { slug: "quan-ao-bong-da", name: "Quần Áo Bóng Đá", nameEn: "Football kits", iconKey: "Shirt" },
  { slug: "patch-tay", name: "Patch Tay", nameEn: "Hand patches", iconKey: "BadgeCheck" },
  { slug: "nameset-chong-nhiem", name: "Nameset Chống Nhiễm", nameEn: "Anti-dye namesets", iconKey: "Tags" },
  { slug: "shop-ao-in", name: "Shop áo in", nameEn: "Printed shirts", iconKey: "Shirt" },
  { slug: "quan-ao-bong-da-hd", name: "Quần Áo Bóng Đá HD", nameEn: "HD football kits", iconKey: "Shirt" },
  { slug: "ao-player-doi-tuyen-quoc-gia", name: "Áo Player Đội Tuyển Quốc Gia", nameEn: "National team player kits", iconKey: "Shirt" },
  { slug: "ao-player-clb", name: "Áo Player CLB", nameEn: "Club player kits", iconKey: "Shirt" },
] as const;

export default function Home() {
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [searchTerm, setSearchTerm] = useState("");
  const [recentProductIds, setRecentProductIds] = useState<number[]>(getRecentProductIds);
  const t = translations[lang];
  const productsQuery = trpc.store.products.useQuery({});
  const categoriesQuery = trpc.store.categories.useQuery();
  const allProducts = productsQuery.data || [];
  const [hoverPreview, setHoverPreview] = useState<{ productId: number; index: number } | null>(null);
  const categories = categoriesQuery.data || [];
  const physicalCategories = categories.filter(category => category.type === "physical");
  const categoryRail = CATEGORY_RAIL_FALLBACKS.map(fallback => {
    const live = physicalCategories.find(category => category.slug === fallback.slug);
    return live ? { ...fallback, ...live } : fallback;
  });
  const productImages = (product: (typeof allProducts)[number]) => Array.from(new Set([product.image, ...(product.gallery || [])].filter(isRenderableImageUrl)));
  const newestFirst = (a: (typeof allProducts)[number], b: (typeof allProducts)[number]) => {
    const createdDiff = new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime();
    return Number.isFinite(createdDiff) && createdDiff !== 0 ? createdDiff : b.id - a.id;
  };
  const physicalProducts = allProducts.filter(product => product.type === "physical").sort(newestFirst);
  const digitalProducts = allProducts.filter(product => product.type === "digital").sort(newestFirst);
  const recentProducts = recentProductIds.map(id => allProducts.find(product => product.id === id)).filter((product): product is typeof allProducts[number] => Boolean(product));
  const physicalProductIds = useMemo(() => physicalProducts.map(product => product.id), [physicalProducts]);
  const wholesaleTiersQuery = trpc.store.productWholesaleTiersForProducts.useQuery({ productIds: physicalProductIds.length ? physicalProductIds : [1] }, { enabled: physicalProductIds.length > 0 });
  const lowestWholesalePriceByProduct = useMemo(() => new Map((wholesaleTiersQuery.data || []).flatMap(entry => { const prices = entry.tiers.map(tier => Number(tier.unitPrice)).filter(price => Number.isFinite(price) && price > 0); return prices.length ? [[entry.productId, Math.min(...prices)] as const] : []; })), [wholesaleTiersQuery.data]);
  const previewPrice = (product: (typeof allProducts)[number]) => lowestWholesalePriceByProduct.get(product.id) || Number(product.price);
  const hasWholesalePreviewPrice = (product: (typeof allProducts)[number]) => lowestWholesalePriceByProduct.has(product.id);

  useEffect(() => {
    const timer = window.setInterval(() => { const current = getClientLanguage(); if (current !== lang) setLang(current); }, 500);
    return () => window.clearInterval(timer);
  }, [lang]);
  useEffect(() => {
    const refresh = () => setRecentProductIds(getRecentProductIds());
    window.addEventListener("dhlstores-customer-tools", refresh);
    return () => window.removeEventListener("dhlstores-customer-tools", refresh);
  }, []);

  const formatCurrency = (value: string | number, priceUsd?: string | number | null) => {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) return lang === "vi" ? "Đang cập nhật" : "Updating";
    return formatLocalizedPrice(amount, lang, priceUsd);
  };
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("vi");
  const suggestions = useMemo(() => !normalizedSearch ? [] : allProducts.filter(product => `${product.name} ${product.nameEn || ""} ${product.slug || ""}`.toLocaleLowerCase("vi").includes(normalizedSearch)).slice(0, 6), [allProducts, normalizedSearch]);
  const physicalFeatured = physicalProducts.filter(product => product.featured).concat(physicalProducts.filter(product => !product.featured)).slice(0, 8);
  const digitalFeatured = digitalProducts.filter(product => product.featured).concat(digitalProducts.filter(product => !product.featured)).slice(0, 6);
  useEffect(() => {
    if (!hoverPreview) return;
    const product = allProducts.find(item => item.id === hoverPreview.productId);
    if (!product || productImages(product).length < 2) return;
    const timer = window.setInterval(() => setHoverPreview(current => {
      if (!current || current.productId !== product.id) return current;
      const images = productImages(product);
      return { ...current, index: (current.index + 1) % images.length };
    }), 1200);
    return () => window.clearInterval(timer);
  }, [hoverPreview?.productId, allProducts]);

  return <StoreLayout>
    <div className="min-h-screen bg-[#f5f5f5]">
      <section className="bg-gradient-to-r from-[#0875e1] via-[#0b1f5e] to-[#17b8f5] text-white">
        <div className="mx-auto max-w-[1600px] px-4 pb-4 pt-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-white/90"><span>DHL STORES · {lang === "vi" ? "Mua sắm nhanh, giao hàng rõ ràng" : "Fast shopping, clear delivery"}</span><span className="hidden sm:inline">{lang === "vi" ? "Kho chính · cập nhật tồn kho liên tục" : "Main stock · continuously updated"}</span></div>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_270px] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-sky-100">{lang === "vi" ? "Chợ sản phẩm DHL Stores" : "DHL Stores marketplace"}</p><h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">{lang === "vi" ? "Nameset chống nhiễm VIP nhất VN" : "Vietnam's top anti-dye namesets"}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/90">{lang === "vi" ? "Ưu tiên nameset chống nhiễm, quần áo bóng đá, áo in và patch. Tài nguyên số được gom riêng bên dưới để bạn vẫn tìm thấy nhanh khi cần." : "Shop anti-dye namesets, football kits, printed shirts and patches first. Digital resources stay in a clear section below."}</p></div>
            <div className="rounded-2xl bg-white/15 p-4 backdrop-blur-sm"><div className="flex items-center gap-3"><div className="grid h-12 w-12 place-items-center rounded-full bg-white text-[#0875e1]"><Truck className="h-6 w-6" /></div><div><p className="text-xs font-black uppercase tracking-wide">{lang === "vi" ? "Mua hàng an tâm" : "Shop with confidence"}</p><p className="mt-1 text-xs text-white/85">{lang === "vi" ? "Chọn SKU · kiểm tra tồn · theo dõi đơn" : "Choose SKU · check stock · track orders"}</p></div></div></div>
          </div>
          <div className="relative z-20 mt-4 max-w-4xl"><div className="flex h-12 items-center rounded-md bg-white px-3 shadow-lg focus-within:ring-4 focus-within:ring-white/30"><Search className="mr-2 h-5 w-5 shrink-0 text-[#0875e1]" /><input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={lang === "vi" ? "Tìm sản phẩm, SKU, tên áo, patch..." : "Search products, SKU, shirt, patch..."} className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" autoComplete="off" /><button type="button" onClick={() => window.dispatchEvent(new Event("dhlstores-open-image-search"))} className="inline-flex shrink-0 items-center gap-1 rounded-md bg-sky-50 px-2 py-2 text-[10px] font-black text-[#0759b8] sm:px-3 sm:text-xs"><Camera className="h-4 w-4" /><span className="hidden sm:inline">{lang === "vi" ? "Tìm bằng ảnh" : "Image search"}</span></button>{searchTerm && <button type="button" onClick={() => setSearchTerm("")} className="ml-1 p-1 text-slate-400" aria-label="Xóa tìm kiếm"><X className="h-4 w-4" /></button>}</div>{normalizedSearch && <div className="absolute left-0 right-0 top-14 overflow-hidden rounded-md bg-white text-slate-900 shadow-2xl">{suggestions.length ? suggestions.map(product => <Link key={product.id} href={`/product/${product.slug}`} onClick={() => setSearchTerm("")} className="flex items-center gap-3 border-b border-slate-100 px-4 py-3 hover:bg-sky-50"><div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-slate-100">{isRenderableImageUrl(product.image) ? <img src={product.image} alt="" className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center text-[9px] font-black text-sky-500">DHL</span>}</div><span className="min-w-0 flex-1 truncate text-sm font-bold">{catalogName(product, lang)}</span><ChevronRight className="h-4 w-4 text-slate-300" /></Link>) : <p className="p-4 text-center text-xs text-slate-500">{lang === "vi" ? "Không tìm thấy sản phẩm" : "No products found"}</p>}<Link href={`/products?search=${encodeURIComponent(searchTerm)}`} onClick={() => setSearchTerm("")} className="block bg-slate-50 px-4 py-3 text-center text-xs font-black text-[#0875e1]">{lang === "vi" ? "Xem toàn bộ kết quả" : "View all results"}</Link></div>}</div>
        </div>
      <nav aria-label={lang === "vi" ? "Danh mục sản phẩm" : "Product categories"} className="mx-auto mt-5 max-w-[1600px] px-4 pb-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/20 bg-slate-950/20 p-2 shadow-inner backdrop-blur-sm">
        <div className="mb-2 flex items-center justify-between gap-3 px-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/75"><span>{lang === "vi" ? "Chọn nhanh danh mục" : "Shop by category"}</span><span className="hidden sm:inline">{lang === "vi" ? "Hiển thị đầy đủ danh mục" : "All categories shown"}</span></div>
        <div className="grid grid-cols-2 gap-2 px-1 pb-1 sm:grid-cols-3 lg:grid-cols-4">
          <Link href="/products?type=physical" className="group flex min-h-[58px] min-w-0 items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-[#0759b8] shadow-md transition hover:-translate-y-0.5 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-[#0875e1]"><PackageCheck className="h-5 w-5" /></span><span className="min-w-0 whitespace-normal leading-tight">{lang === "vi" ? "Tất cả hàng vật lý" : "All physical products"}</span></Link>
          {categoryRail.map(category => { const Icon = getCategoryIcon(category.iconKey); const live = physicalCategories.find(item => item.slug === category.slug); const href = live ? `/products?type=physical&categoryId=${live.id}` : `/products?type=physical&search=${encodeURIComponent(category.name)}`; return <Link key={category.slug} href={href} className="group flex min-h-[58px] min-w-0 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15 text-sky-100 transition group-hover:bg-white group-hover:text-[#0875e1]"><Icon className="h-5 w-5" /></span><span className="min-w-0 whitespace-normal leading-tight">{lang === "vi" ? category.name : category.nameEn}</span></Link>; })}
          <Link href="/products?type=digital" className="group flex min-h-[58px] min-w-0 items-center gap-2 rounded-xl border border-sky-200/60 bg-sky-300/20 px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-sky-300/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-[#0759b8]"><Download className="h-5 w-5" /></span><span className="min-w-0 whitespace-normal leading-tight">{lang === "vi" ? "Tài nguyên số" : "Digital resources"}</span></Link>
        </div>
        </div>
      </nav>

      </section>

      <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <section><div className="mb-3 flex items-end justify-between"><div><div className="flex items-center gap-2"><Flame className="h-5 w-5 text-[#0875e1]" /><h2 className="text-xl font-black text-slate-900 sm:text-2xl">{lang === "vi" ? "Hàng vật lý bán chạy" : "Popular physical products"}</h2></div><p className="mt-1 text-xs text-slate-500">{lang === "vi" ? "Chọn sản phẩm, vào chi tiết để chọn SKU và số lượng." : "Open a product to choose SKU and quantity."}</p></div><Link href="/products?type=physical" className="flex items-center gap-1 text-xs font-black text-[#0875e1]">{lang === "vi" ? "Xem tất cả" : "View all"}<ArrowRight className="h-4 w-4" /></Link></div>{physicalFeatured.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">{physicalFeatured.map(product => <article key={product.id} onMouseEnter={() => setHoverPreview({ productId: product.id, index: 0 })} onMouseLeave={() => setHoverPreview(null)} className="group relative overflow-hidden rounded-sm bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl"><Link href={'/product/' + product.slug} className="block"><div className="aspect-square overflow-hidden bg-slate-100">{(() => { const images = productImages(product); const image = images[hoverPreview?.productId === product.id ? hoverPreview.index % images.length : 0]; return image ? <img src={image} alt={catalogName(product, lang)} loading="lazy" decoding="async" className="h-full w-full object-contain transition duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-center text-xs font-black text-slate-400">{lang === 'vi' ? 'Ảnh đang cập nhật' : 'Image updating'}</div>; })()}</div><div className="p-3"><p className="line-clamp-2 min-h-9 text-xs font-bold leading-relaxed text-slate-800">{catalogName(product, lang)}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="text-base font-black text-[#0759b8]">{hasWholesalePreviewPrice(product) && <span className="mr-1 text-[10px] font-bold text-[#0759b8]"><Zap className="mr-0.5 inline-block h-3 w-3 animate-[pulse_1.8s_ease-in-out_infinite] align-[-1px] text-[#38bdf8]" aria-hidden="true" />{lang === "vi" ? "Giá sỉ từ" : "Wholesale from"}</span>}{formatCurrency(previewPrice(product))}</span><span className="text-[10px] text-slate-500">{Number(product.stock) > 0 ? <>{product.stock} {lang === "vi" ? "còn" : "left"}</> : (lang === "vi" ? "Hết hàng" : "Sold out")}</span></div><div className="mt-2 flex items-center gap-1 text-[10px] font-bold text-slate-500"><PackageCheck className="h-3.5 w-3.5 text-emerald-600" />{lang === "vi" ? "Giao 2–5 ngày" : "2–5 day delivery"}</div></div></Link></article>)}</div> : <div className="rounded-md border border-dashed border-sky-300 bg-white p-10 text-center"><p className="font-black text-sky-700">{lang === "vi" ? "Kho hàng vật lý đang được cập nhật" : "Physical stock is being updated"}</p><Link href="/products?type=digital" className="mt-3 inline-flex text-xs font-black text-blue-700">{lang === "vi" ? "Xem tài nguyên số" : "View digital resources"}<ArrowRight className="ml-1 h-4 w-4" /></Link></div>}</section>

        <section className="rounded-md bg-gradient-to-r from-blue-700 to-indigo-700 p-5 text-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2"><Zap className="h-5 w-5 text-sky-300" /><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">{lang === "vi" ? "Khu riêng tài nguyên số" : "Digital resources zone"}</p></div><h2 className="mt-1 text-xl font-black sm:text-2xl">{lang === "vi" ? "Font, vector, nameset và file thiết kế" : "Fonts, vectors, namesets and design files"}</h2><p className="mt-1 text-xs text-blue-100">{lang === "vi" ? "Thanh toán QR xác nhận xong, quyền tải mở trong 7 ngày." : "After QR payment confirmation, downloads unlock for 7 days."}</p></div><Link href="/products?type=digital" className="inline-flex items-center gap-1 rounded-md bg-white px-4 py-2 text-xs font-black text-blue-800 hover:bg-blue-50">{lang === "vi" ? "Vào kho tài nguyên số" : "Open digital library"}<ArrowRight className="h-4 w-4" /></Link></div>{digitalFeatured.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{digitalFeatured.map(product => <article key={product.id} onMouseEnter={() => setHoverPreview({ productId: product.id, index: 0 })} onMouseLeave={() => setHoverPreview(null)} className="group relative overflow-hidden rounded-md bg-white text-slate-900"><Link href={'/product/' + product.slug} className="block"><div className="aspect-square overflow-hidden bg-blue-50">{(() => { const images = productImages(product); const image = images[hoverPreview?.productId === product.id ? hoverPreview.index % images.length : 0]; return image ? <img src={image} alt={catalogName(product, lang)} className="h-full w-full object-contain transition group-hover:scale-105" /> : <AssetVisual categoryId={product.categoryId} title={catalogName(product, lang)} fileSize={product.fileSize} imageUrl={product.image} className="h-full w-full object-contain transition group-hover:scale-105" />; })()}</div><div className="p-2"><p className="line-clamp-2 text-[11px] font-bold">{catalogName(product, lang)}</p><p className="mt-1 text-xs font-black text-[#0875e1]">{formatCurrency(product.price, product.priceUsd)}</p></div></Link></article>)}</div>}</section>

        <section className="grid gap-3 md:grid-cols-3"><div className="rounded-md bg-white p-4 shadow-sm"><PackageCheck className="h-6 w-6 text-[#0875e1]" /><h3 className="mt-2 text-sm font-black">{lang === "vi" ? "Kho chính rõ ràng" : "Clear main stock"}</h3><p className="mt-1 text-xs text-slate-500">{lang === "vi" ? "Tồn kho website là nguồn chính, đồng bộ Sapo ở phía sau." : "Website stock is primary, with Sapo sync in the background."}</p></div><div className="rounded-md bg-white p-4 shadow-sm"><ShieldCheck className="h-6 w-6 text-emerald-600" /><h3 className="mt-2 text-sm font-black">{lang === "vi" ? "Thanh toán rõ ràng" : "Clear payments"}</h3><p className="mt-1 text-xs text-slate-500">{lang === "vi" ? "Xem giá, SKU, phí ship và trạng thái đơn trước khi xác nhận." : "See price, SKU, shipping and order status before confirming."}</p></div><div className="rounded-md bg-white p-4 shadow-sm"><Sparkles className="h-6 w-6 text-blue-600" /><h3 className="mt-2 text-sm font-black">{lang === "vi" ? "Mua lại nhanh" : "Buy again faster"}</h3><p className="mt-1 text-xs text-slate-500">{lang === "vi" ? "Lịch sử xem và tài nguyên số luôn được gom ở đúng khu vực." : "Recent views and digital resources stay easy to find."}</p></div></section>

        {recentProducts.length > 0 && <section className="rounded-md bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><History className="h-4 w-4 text-indigo-600" /><h2 className="text-sm font-black text-slate-900">{lang === "vi" ? "Bạn đã xem gần đây" : "Recently viewed"}</h2></div><button type="button" onClick={() => { clearRecentProducts(); setRecentProductIds([]); }} className="text-[10px] font-black text-indigo-700">{lang === "vi" ? "Xóa lịch sử" : "Clear"}</button></div><div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{recentProducts.map(product => <Link key={product.id} href={`/product/${product.slug}`} className="flex min-w-0 items-center gap-2 rounded border border-slate-100 p-2 hover:border-sky-200">{isRenderableImageUrl(product.image) ? <img src={product.image} alt="" className="h-10 w-10 rounded object-contain" /> : <span className="grid h-10 w-10 place-items-center rounded bg-slate-100 text-[9px] font-black text-sky-500">DHL</span>}<span className="min-w-0"><span className="block truncate text-[10px] font-bold">{catalogName(product, lang)}</span><span className="text-[10px] font-black text-[#0759b8]">{product.type === "physical" && hasWholesalePreviewPrice(product) && <span className="mr-1 font-bold text-[#0759b8]"><Zap className="mr-0.5 inline-block h-3 w-3 animate-[pulse_1.8s_ease-in-out_infinite] align-[-1px] text-[#38bdf8]" aria-hidden="true" />{lang === "vi" ? "Giá sỉ từ" : "Wholesale from"}</span>}{formatCurrency(product.type === "physical" ? previewPrice(product) : product.price, product.type === "digital" ? product.priceUsd : undefined)}</span></span></Link>)}</div></section>}
      </main>
    </div>
  </StoreLayout>;
}
