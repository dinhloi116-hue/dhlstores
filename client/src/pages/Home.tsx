import { useState, useEffect } from "react";
import StoreLayout from "@/components/StoreLayout";
import AssetVisual from "@/components/AssetVisual";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { translations, getClientLanguage, Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, FolderGit2 } from "lucide-react";

export default function Home() {
  const [lang, setLang] = useState<Language>(getClientLanguage());

  useEffect(() => {
    const interval = setInterval(() => {
      const current = getClientLanguage();
      if (current !== lang) setLang(current);
    }, 500);
    return () => clearInterval(interval);
  }, [lang]);

  const t = translations[lang];

  const productsQuery = trpc.store.products.useQuery({});
  const allProducts = productsQuery.data || [];

  const formatCurrency = (val: string | number) => {
    const num = Number(val);
    if (lang === 'en') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num / 25000);
    }
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  return (
    <StoreLayout>
      {/* Banner / Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="relative overflow-hidden rounded-[1.4rem] border border-slate-700/70 bg-[#0b1220] px-6 py-10 text-white shadow-2xl sm:px-12 sm:py-14">
          <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:24px_24px]" />
          <div className="absolute -right-20 top-1/2 h-80 w-80 -translate-y-1/2 rotate-12 border-[24px] border-violet-500/40" />
          <div className="absolute -bottom-40 left-[12%] h-72 w-72 rotate-45 border border-amber-300/30" />
          <div className="relative z-10 max-w-3xl space-y-5 sm:mx-auto sm:text-center">
            <span className="inline-flex rounded-md border border-amber-300/40 bg-amber-400 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-slate-950">
              DHL STORES · DIGITAL RESOURCE VAULT
            </span>
            <h1 className="font-display text-5xl font-black uppercase leading-[0.82] tracking-tight sm:text-7xl">
              {lang === 'vi' ? <>TÀI NGUYÊN <span className="text-amber-400">THIẾT KẾ</span> THỂ THAO</> : <>SPORTS DESIGN <span className="text-amber-400">RESOURCE</span> VAULT</>}
            </h1>
            <p className="max-w-2xl text-xs leading-relaxed text-slate-300 sm:mx-auto sm:text-sm">
              {lang === 'vi'
                ? 'Font thể thao, name set, vector, file in DTF, patch, mockup và template sẵn sàng cho thiết kế – in ấn.'
                : 'Sports fonts, name sets, vectors, DTF print files, patches, mockups and templates ready for design and printing.'}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-300 sm:justify-center">
              <span>01. Chọn tài nguyên</span><span className="text-amber-400">/</span><span>02. Thanh toán QR</span><span className="text-amber-400">/</span><span>03. Nhận quyền tải</span>
            </div>
            <div className="flex justify-start pt-2 sm:justify-center">
              <Link href="/products">
                <Button className="bg-amber-400 px-6 py-5 font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300">
                  {t.exploreShop}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Category Icons Bar (10 danh mục chuyên sâu) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {[
            { id: 1, name: lang === 'vi' ? 'Font Chữ Thể Thao' : 'Sports Fonts', catId: 1 },
            { id: 2, name: lang === 'vi' ? 'Tên Số Áo Đấu' : 'Name Sets', catId: 2 },
            { id: 3, name: lang === 'vi' ? 'Vector & SVG' : 'Vector & SVG', catId: 3 },
            { id: 4, name: lang === 'vi' ? 'File In Áo DTF' : 'DTF Print Files', catId: 4 },
            { id: 5, name: lang === 'vi' ? 'Patch & Badge' : 'Patch & Badge', catId: 5 },
            { id: 6, name: lang === 'vi' ? 'Template Thiết Kế' : 'Design Templates', catId: 6 },
            { id: 7, name: lang === 'vi' ? 'Mockup Sản Phẩm' : 'Product Mockups', catId: 7 },
            { id: 8, name: lang === 'vi' ? 'Clipart & PNG' : 'Clipart & PNG', catId: 8 },
            { id: 9, name: lang === 'vi' ? 'Pattern & BG' : 'Pattern & BG', catId: 9 },
            { id: 10, name: lang === 'vi' ? 'Combo Bundle' : 'Design Bundles', catId: 10 },
          ].map(c => (
            <Link key={c.catId} href={`/products?categoryId=${c.catId}`} className="border border-slate-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-500 hover:shadow-md text-center group">
              <FolderGit2 className="mx-auto mb-1.5 h-5 w-5 text-amber-600 transition-transform group-hover:scale-110" />
              <h4 className="text-[11px] font-extrabold text-slate-800 line-clamp-1">{c.name}</h4>
            </Link>
          ))}
        </div>
      </div>

      {/* Product Catalog Grid */}
      <section className="py-10 bg-white border-t border-slate-200 mt-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
            {allProducts.map((p) => (
              <Link key={p.id} href={`/product/${p.slug}`} className="group">
                  <div className="overflow-hidden border border-slate-200 bg-white transition-all duration-200 group-hover:-translate-y-1 group-hover:border-amber-500 group-hover:shadow-xl flex flex-col h-full">
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <AssetVisual categoryId={p.categoryId} title={p.name} fileSize={p.fileSize} className="transition-transform duration-300 group-hover:scale-105" />
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
    </StoreLayout>
  );
}
