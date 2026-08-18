import { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { trpc } from "@/lib/trpc";
import { clearRecentProducts, getRecentProductIds } from "@/lib/customer-tools";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCategoryIcon } from "@/lib/category-icons";
import { ArrowRight, CircleHelp, Download, FolderGit2, History, PackageCheck, Search, ShieldCheck, Sparkles, X } from "lucide-react";

export default function Home() {
  const [lang, setLang] = useState<Language>(getClientLanguage());
  const [searchTerm, setSearchTerm] = useState("");
  const [recentProductIds, setRecentProductIds] = useState<number[]>(getRecentProductIds);

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  useEffect(() => {
    const refresh = () => setRecentProductIds(getRecentProductIds());
    window.addEventListener("dhlstores-customer-tools", refresh);
    return () => window.removeEventListener("dhlstores-customer-tools", refresh);
  }, []);

  const t = translations[lang];

  const productsQuery = trpc.store.products.useQuery({});
  const categoriesQuery = trpc.store.categories.useQuery();
  const siteSettingsQuery = trpc.store.siteSettings.useQuery();
  const allProducts = productsQuery.data || [];
  const digitalProducts = allProducts.filter(product => product.type === "digital");
  const physicalProducts = allProducts.filter(product => product.type === "physical");
  const recentProducts = recentProductIds.map(id => allProducts.find(product => product.id === id)).filter((product): product is typeof allProducts[number] => Boolean(product));
  const categories = categoriesQuery.data || [];
  const homeHeading = siteSettingsQuery.data?.homeHeading || (lang === "vi" ? "Tài nguyên thiết kế thể thao" : "Sports design resources");
  const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("vi");
  const searchSuggestions = !normalizedSearchTerm ? [] : allProducts.filter(product => {
    const category = categories.find(item => item.id === product.categoryId);
    return `${product.name} ${product.description || ""} ${product.slug || ""} ${category?.name || ""}`.toLocaleLowerCase("vi").includes(normalizedSearchTerm);
  }).slice(0, 6);

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <StoreLayout>
      <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 2xl:px-10">
        <div className="mb-4 flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
          <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">DHL Stores · Resource Library</p><h1 className="mt-1 font-display text-3xl font-black uppercase leading-none text-slate-900 sm:text-4xl">{homeHeading}</h1></div>
          <Link href="/products"><Button variant="outline" size="sm" className="shrink-0 border-slate-300 bg-white text-xs font-bold text-slate-800 hover:border-amber-400 hover:bg-amber-50">{t.exploreShop}<ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link>
        </div>
        <div className="relative z-20 mb-5 max-w-3xl">
          <label htmlFor="home-product-search" className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Tìm nhanh sản phẩm</label>
          <div className="mt-1 flex h-12 items-center rounded-xl border border-slate-300 bg-white px-3 shadow-sm transition focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-100">
            <Search className="mr-2 h-5 w-5 shrink-0 text-amber-600" />
            <input id="home-product-search" value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Tìm tên sản phẩm, loại tài nguyên hoặc danh mục..." className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400" autoComplete="off" />
            {searchTerm && <button type="button" onClick={() => setSearchTerm("")} className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Xóa từ khóa tìm kiếm"><X className="h-4 w-4" /></button>}
          </div>
          {normalizedSearchTerm && <div className="absolute left-0 right-0 top-[4.45rem] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"><div className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-[11px] font-black text-slate-600">{searchSuggestions.length ? `Gợi ý ${searchSuggestions.length} sản phẩm phù hợp` : "Không tìm thấy sản phẩm phù hợp"}</div>{searchSuggestions.length ? <div className="divide-y divide-slate-100">{searchSuggestions.map(product => { const category = categories.find(item => item.id === product.categoryId); return <Link key={product.id} href={`/product/${product.slug}`} onClick={() => setSearchTerm("")} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-amber-50"><div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100 text-[11px] font-black text-amber-700">{product.image ? <img src={product.image} alt="" className="h-full w-full object-cover" /> : product.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-black text-slate-900 group-hover:text-amber-700">{product.name}</p><p className="mt-0.5 truncate text-[11px] text-slate-500">{category?.name || "Sản phẩm"} · {formatCurrency(product.price)}</p></div><ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-amber-600" /></Link>; })}</div> : <div className="px-4 py-5 text-center text-xs leading-relaxed text-slate-500">Thử tìm theo tên sản phẩm, loại tài nguyên hoặc danh mục khác.</div>}<Link href={`/products?search=${encodeURIComponent(searchTerm)}`} onClick={() => setSearchTerm("")} className="flex items-center justify-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs font-black text-amber-700 transition hover:bg-amber-50">Xem toàn bộ kết quả <ArrowRight className="h-3.5 w-3.5" /></Link></div>}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
          {categoriesQuery.isLoading ? Array.from({ length: 10 }).map((_, index) => <div key={index} className="h-16 animate-pulse border border-slate-200 bg-slate-100" />) : categories.map(category => { const Icon = getCategoryIcon(category.iconKey); return (
            <Link key={category.id} href={`/products?categoryId=${category.id}`} className="dhl-hover-card relative border border-slate-200 bg-white p-3 text-center shadow-sm hover:bg-amber-50 group">
              <Icon className="mx-auto mb-1.5 h-5 w-5 text-amber-600 transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6" />
              <h4 className="text-[11px] font-extrabold text-slate-800 line-clamp-1">{category.name}</h4>
              {category.type === "physical" && <span className="absolute right-1.5 top-1.5 rounded bg-emerald-100 px-1 py-0.5 text-[7px] font-black uppercase tracking-wide text-emerald-700">Hàng vật lý</span>}
            </Link>
          ); })}
        </div>
      </div>

      {recentProducts.length > 0 && <section className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6 lg:px-8 2xl:px-10"><div className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><History className="h-4 w-4" /></div><div><p className="text-xs font-black text-slate-900">Bạn đã xem gần đây</p><p className="mt-0.5 text-[10px] text-slate-500">Lịch sử chỉ lưu trên thiết bị này để bạn quay lại nhanh.</p></div></div><button type="button" onClick={() => { clearRecentProducts(); setRecentProductIds([]); }} className="text-[10px] font-black text-indigo-700 hover:text-indigo-900">Xóa lịch sử</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">{recentProducts.map(product => <Link key={product.id} href={`/product/${product.slug}`} className="group flex min-w-0 items-center gap-2 rounded-xl border border-indigo-100 bg-white p-2 transition hover:border-indigo-300 hover:bg-indigo-50"><img src={product.image} alt="" className="h-10 w-10 rounded-lg border border-slate-200 bg-slate-50 object-contain" /><span className="min-w-0"><span className="block truncate text-[11px] font-black text-slate-900 group-hover:text-indigo-700">{product.name}</span><span className="mt-0.5 block text-[10px] font-bold text-amber-700">{formatCurrency(product.price)}</span></span></Link>)}</div></div></section>}
      <section className="border-y border-slate-200 bg-slate-50/70 py-8">
        <div className="mx-auto grid max-w-[1600px] gap-5 px-4 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:px-8 2xl:px-10">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Chọn nhanh theo nhu cầu</p><h2 className="mt-1 font-display text-2xl font-black uppercase text-slate-900">Đúng tài nguyên, đúng mục đích</h2></div><Sparkles className="h-6 w-6 shrink-0 text-amber-500" /></div><div className="grid divide-y divide-slate-100 md:grid-cols-3 md:divide-x md:divide-y-0">{[{ title: "Thiết kế & in ấn", copy: "Font, vector, mockup và file in áo.", tone: "bg-violet-50 text-violet-700" }, { title: "Hoàn thiện áo đấu", copy: "Nameset, patch tay và phụ kiện ép nhiệt.", tone: "bg-emerald-50 text-emerald-700" }, { title: "Tìm theo danh mục", copy: "Mở toàn bộ thư viện để lọc nhanh.", tone: "bg-amber-50 text-amber-700" }].map((item, index) => <Link key={item.title} href={index === 2 ? "/products" : `/products?categoryId=${categories.find(category => index === 0 ? category.type === "digital" : category.slug === "nameset-chong-nhiem")?.id || ""}`} className="group p-4 transition-colors hover:bg-slate-50"><span className={`inline-flex rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wide ${item.tone}`}>Lối tắt</span><p className="mt-3 text-sm font-black text-slate-900 group-hover:text-amber-600">{item.title}<ArrowRight className="ml-1 inline h-3.5 w-3.5" /></p><p className="mt-1 text-xs leading-relaxed text-slate-500">{item.copy}</p></Link>)}</div></div>
          <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm"><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">DHL Stores · cách mua</p><h2 className="mt-1 font-display text-2xl font-black uppercase leading-tight">Chọn nhanh, thanh toán rõ, nhận đúng sản phẩm</h2><div className="mt-4 space-y-3">{[{ icon: PackageCheck, title: "1. Chọn sản phẩm", copy: "Chọn tài nguyên số hoặc phiên bản hàng vật lý phù hợp." }, { icon: ShieldCheck, title: "2. Quét QR theo loại sản phẩm", copy: "Digital dùng QR VietinBank SePay có nội dung đối soát; hàng vật lý dùng QR Techcombank không cần cú pháp." }, { icon: Download, title: "3. Nhận sản phẩm", copy: "SePay tự mở link tải digital trong 7 ngày; hàng vật lý do cửa hàng xác nhận và theo dõi theo đơn." }].map(step => <div key={step.title} className="flex gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-amber-400"><step.icon className="h-4 w-4" /></div><div><p className="text-xs font-black text-white">{step.title}</p><p className="mt-0.5 text-[11px] leading-relaxed text-slate-300">{step.copy}</p></div></div>)}</div></div>
        </div>
      </section>

      {/* Product Catalog Grid */}
      <section className="py-10 bg-white border-t border-slate-200 mt-6">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
            <div>
              <h2 className="font-display text-3xl font-black uppercase tracking-wide text-slate-900">
                {lang === 'vi' ? 'Tài Nguyên Số Mới Nhất & Nổi Bật' : 'Latest & Featured Digital Assets'}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{lang === 'vi' ? 'Tải xuống sau khi giao dịch QR được hệ thống xác nhận' : 'Downloads unlock after QR payment is confirmed'}</p>
            </div>
            <Link href="/products">
              <Button variant="outline" size="sm" className="text-xs font-bold border-slate-200 text-slate-700 hover:bg-slate-100">
                {t.viewAll} <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productsQuery.isLoading ? Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="overflow-hidden border border-slate-200 bg-white">
                <div className="aspect-[4/3] animate-pulse bg-slate-200" />
                <div className="space-y-3 p-4"><div className="h-3 w-4/5 animate-pulse bg-slate-200" /><div className="h-3 w-full animate-pulse bg-slate-100" /><div className="h-4 w-1/3 animate-pulse bg-slate-200" /></div>
              </div>
            )) : digitalProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                  <div className="dhl-hover-card flex h-full flex-col overflow-hidden border border-slate-200 bg-white">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <AssetVisual categoryId={p.categoryId} title={p.name} fileSize={p.fileSize} imageUrl={p.image} className="transition-transform duration-300 group-hover:scale-105" />
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-violet-700 text-white text-[10px] font-bold px-2 py-0.5">
                        Digital Asset
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 group-hover:text-amber-600 transition-colors line-clamp-2 leading-relaxed">
                        {p.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {p.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <span className="text-sm font-black text-amber-600">
                        {formatCurrency(p.price)}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                        {t.details}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-emerald-100 bg-emerald-50/40 py-10">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mb-8 flex items-center justify-between border-b border-emerald-100 pb-4"><div><h2 className="font-display text-3xl font-black uppercase tracking-wide text-slate-900">{lang === "vi" ? "Hàng Thể Thao Mới & Nổi Bật" : "New & Featured Sports Gear"}</h2><p className="mt-0.5 text-xs text-slate-500">{lang === "vi" ? "Áo bóng đá, patch tay và nameset sẵn sàng đặt hàng." : "Football apparel, sleeve patches and namesets ready to order."}</p></div><Link href="/products"><Button variant="outline" size="sm" className="border-emerald-200 bg-white text-xs font-bold text-emerald-800 hover:bg-emerald-100">{t.viewAll} <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></Link></div>
          {physicalProducts.length > 0 ? <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">{physicalProducts.filter(product => product.featured).concat(physicalProducts.filter(product => !product.featured)).slice(0, 8).map(product => <Link key={product.id} href={`/product/${product.slug}`} className="group"><div className="dhl-hover-card flex h-full flex-col overflow-hidden border border-emerald-200 bg-white shadow-sm"><div className="aspect-square overflow-hidden bg-slate-50"><img src={product.image} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /></div><div className="flex flex-1 flex-col justify-between space-y-3 p-4"><div><Badge className="mb-2 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-800">Hàng vật lý</Badge><h3 className="line-clamp-2 text-xs font-bold leading-relaxed text-slate-800 transition-colors group-hover:text-emerald-700">{product.name}</h3><p className="mt-1 text-[11px] text-slate-500">Còn {product.stock} sản phẩm</p></div><div className="flex items-center justify-between border-t border-emerald-50 pt-2"><span className="text-sm font-black text-emerald-700">{formatCurrency(product.price)}</span><span className="rounded bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 transition-colors group-hover:bg-emerald-600 group-hover:text-white">Đặt hàng</span></div></div></div></Link>)}</div> : <div className="rounded-2xl border border-dashed border-emerald-300 bg-white/70 px-6 py-10 text-center"><p className="font-display text-2xl font-black uppercase text-emerald-900">Danh mục hàng thể thao đã sẵn sàng</p><p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Sản phẩm quần áo bóng đá, patch tay và nameset chống nhiễm sẽ xuất hiện tại đây ngay khi quản trị viên đăng hàng.</p></div>}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-[1600px] flex-col items-start justify-between gap-4 px-4 sm:px-6 md:flex-row md:items-center lg:px-8 2xl:px-10"><div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-600">Cần hỗ trợ trước khi đặt?</p><h2 className="mt-1 font-display text-2xl font-black uppercase text-slate-900">Kiểm tra file, SKU hoặc lựa chọn ép nhiệt</h2><p className="mt-1 text-sm text-slate-500">Gửi yêu cầu qua Zalo để được hỗ trợ đúng sản phẩm và phiên bản phù hợp.</p></div><a href="https://zalo.me/0963898871" target="_blank" rel="noreferrer"><Button className="bg-amber-500 font-black text-slate-950 hover:bg-amber-400"><CircleHelp className="mr-2 h-4 w-4" />Hỗ trợ Zalo</Button></a></div>
      </section>
    </StoreLayout>
  );
}
